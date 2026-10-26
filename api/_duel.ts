import { createHash } from "node:crypto";

// Duel matchmaking, invites and match sync. Storage-agnostic so it runs on Redis (Vercel) and in-memory (vite dev).

export interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  hGetAll(key: string): Promise<Record<string, string>>;
  hSet(key: string, field: string, value: string): Promise<void>;
  hDel(key: string, field: string): Promise<number>;
}

export interface DuelSettings { mode: string; continent: string; timeLimit: number }
interface Player { id: string; name: string }
interface Match { id: string; kind: "duel" | "party"; settings: DuelSettings; seed: number; players: Player[]; startAt: number }
interface Member extends Player { ts: number }
interface Party { id: string; host: Player; salt: string; hash: string; settings: DuelSettings; members: Member[]; status: "lobby" | "started"; matchId?: string; ts: number }
interface Invite { id: string; from: Player; to: string; settings: DuelSettings; status: "pending" | "accepted" | "declined" | "cancelled"; matchId?: string; ts: number }
interface Progress { correct: number; score: number; lives: number; answered: number; died: boolean; finished: boolean; finishedAt?: number; ts: number }

const MODES = ["flag-country", "country-capital", "capital-country", "country-flag", "draw-flag", "map-country", "country-map", "pin-country", "pin-capital", "pin-flag"];
const CONTINENTS = ["All", "Europe", "Asia", "Africa", "North America", "South America", "Oceania"];
const TIME_LIMITS = [0, 10, 15, 30, 60];

const PRESENCE_TTL = 15_000;
const QUEUE_TTL = 8_000;
const INVITE_TTL = 60_000;
const START_DELAY = 4_000;
const MATCH_TTL_SECONDS = 3600;
const MAX_PARTY = 8;

type Body = Record<string, unknown>;

function str(value: unknown, max = 64): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseSettings(value: unknown): DuelSettings | null {
  const v = (value ?? {}) as Body;
  const mode = str(v.mode);
  const continent = str(v.continent);
  const timeLimit = Number(v.timeLimit);
  if (!MODES.includes(mode) || !CONTINENTS.includes(continent) || !TIME_LIMITS.includes(timeLimit)) return null;
  return { mode, continent, timeLimit };
}

function validName(name: string): boolean {
  return name.length >= 2 && name.length <= 16;
}

function parse<T>(raw: string | undefined | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

async function createMatch(store: Store, players: Player[], settings: DuelSettings, kind: Match["kind"] = "duel"): Promise<Match> {
  const match: Match = { id: randomId(), kind, settings, seed: Math.floor(Math.random() * 2 ** 31), players, startAt: Date.now() + START_DELAY };
  await store.set(`match:${match.id}`, JSON.stringify(match), MATCH_TTL_SECONDS);
  return match;
}

function matchView(match: Match, myId: string) {
  const others = match.players.filter((p) => p.id !== myId).map((p) => p.name);
  return { id: match.id, kind: match.kind, settings: match.settings, seed: match.seed, opponent: others[0] ?? "", others, startIn: Math.max(0, match.startAt - Date.now()) };
}

function hashPassword(salt: string, password: string): string {
  return password ? createHash("sha256").update(`${salt}:${password}`).digest("hex") : "";
}

function partyView(party: Party) {
  return { id: party.id, host: party.host.name, hostId: party.host.id, members: party.members.map((m) => m.name), hasPassword: !!party.hash, settings: party.settings, status: party.status };
}

async function readParty(store: Store, id: string): Promise<Party | null> {
  return parse<Party>((await store.hGetAll("parties"))[id]);
}

async function writeParty(store: Store, party: Party): Promise<void> {
  await store.hSet("parties", party.id, JSON.stringify(party));
}
export async function handleDuel(store: Store, body: Body): Promise<{ status: number; json: unknown }> {
  const action = str(body.action);
  const id = str(body.id);
  const now = Date.now();
  if (!id) return { status: 400, json: { error: "Missing id" } };
  const ok = (json: unknown) => ({ status: 200, json });
  const bad = (error: string) => ({ status: 400, json: { error } });

  switch (action) {
    case "presence": {
      const name = str(body.name, 16);
      if (!validName(name)) return bad("Invalid name");
      await store.hSet("presence", name, JSON.stringify({ id, ts: now }));
      const presence = await store.hGetAll("presence");
      const online: string[] = [];
      for (const [player, raw] of Object.entries(presence)) {
        const entry = parse<{ ts: number }>(raw);
        if (!entry || now - entry.ts > PRESENCE_TTL) {
          await store.hDel("presence", player);
        } else if (player !== name) online.push(player);
      }
      const invites: { id: string; from: string; settings: DuelSettings }[] = [];
      for (const [inviteId, raw] of Object.entries(await store.hGetAll("invites"))) {
        const invite = parse<Invite>(raw);
        if (!invite || now - invite.ts > INVITE_TTL * 5) await store.hDel("invites", inviteId);
        else if (invite.to === name && invite.status === "pending" && now - invite.ts <= INVITE_TTL) invites.push({ id: invite.id, from: invite.from.name, settings: invite.settings });
      }
      return ok({ online: online.sort((a, b) => a.localeCompare(b)).slice(0, 100), invites });
    }

    case "queue": {
      const name = str(body.name, 16);
      const settings = parseSettings(body.settings);
      if (!validName(name) || !settings) return bad("Invalid queue request");
      const matchId = await store.get(`matchof:${id}`);
      if (matchId) {
        const match = parse<Match>(await store.get(`match:${matchId}`));
        if (match) return ok({ status: "matched", match: matchView(match, id) });
      }
      const key = `queue:${settings.mode}|${settings.continent}|${settings.timeLimit}`;
      const waiting = await store.hGetAll(key);
      let opponent: Player | null = null;
      for (const [otherId, raw] of Object.entries(waiting)) {
        const entry = parse<{ name: string; ts: number }>(raw);
        if (!entry || now - entry.ts > QUEUE_TTL) {
          await store.hDel(key, otherId);
          continue;
        }
        if (otherId === id || entry.name === name || opponent) continue;
        // hDel is the atomic claim: only one concurrent caller gets 1.
        if ((await store.hDel(key, otherId)) === 1) opponent = { id: otherId, name: entry.name };
      }
      if (opponent) {
        await store.hDel(key, id);
        const match = await createMatch(store, [opponent, { id, name }], settings);
        await store.set(`matchof:${opponent.id}`, match.id, 120);
        await store.set(`matchof:${id}`, match.id, 120);
        return ok({ status: "matched", match: matchView(match, id) });
      }
      await store.hSet(key, id, JSON.stringify({ name, ts: now }));
      return ok({ status: "waiting", searching: Object.keys(waiting).length });
    }

    case "leave": {
      const settings = parseSettings(body.settings);
      if (settings) await store.hDel(`queue:${settings.mode}|${settings.continent}|${settings.timeLimit}`, id);
      return ok({ ok: true });
    }

    case "invite": {
      const name = str(body.name, 16);
      const to = str(body.to, 16);
      const settings = parseSettings(body.settings);
      if (!validName(name) || !settings || !validName(to) || to === name) return bad("Invalid invite");
      const target = parse<{ ts: number }>((await store.hGetAll("presence"))[to]);
      if (!target || now - target.ts > PRESENCE_TTL) return { status: 404, json: { error: "Player is offline" } };
      const invite: Invite = { id: randomId(), from: { id, name }, to, settings, status: "pending", ts: now };
      await store.hSet("invites", invite.id, JSON.stringify(invite));
      return ok({ inviteId: invite.id });
    }

    case "inviteStatus": {
      const invite = parse<Invite>((await store.hGetAll("invites"))[str(body.inviteId)]);
      if (!invite || invite.from.id !== id) return ok({ status: "expired" });
      if (invite.status === "accepted" && invite.matchId) {
        const match = parse<Match>(await store.get(`match:${invite.matchId}`));
        if (match) return ok({ status: "accepted", match: matchView(match, id) });
      }
      if (invite.status === "pending" && now - invite.ts > INVITE_TTL) return ok({ status: "expired" });
      return ok({ status: invite.status });
    }

    case "cancelInvite": {
      const inviteId = str(body.inviteId);
      const invite = parse<Invite>((await store.hGetAll("invites"))[inviteId]);
      if (invite && invite.from.id === id && invite.status === "pending") {
        invite.status = "cancelled";
        await store.hSet("invites", inviteId, JSON.stringify(invite));
      }
      return ok({ ok: true });
    }

    case "respond": {
      const name = str(body.name, 16);
      const inviteId = str(body.inviteId);
      const invite = parse<Invite>((await store.hGetAll("invites"))[inviteId]);
      if (!invite || invite.to !== name || invite.status !== "pending" || now - invite.ts > INVITE_TTL) return { status: 404, json: { error: "Invite expired" } };
      if (body.accept !== true) {
        invite.status = "declined";
        await store.hSet("invites", inviteId, JSON.stringify(invite));
        return ok({ ok: true });
      }
      const match = await createMatch(store, [invite.from, { id, name }], invite.settings);
      invite.status = "accepted";
      invite.matchId = match.id;
      await store.hSet("invites", inviteId, JSON.stringify(invite));
      return ok({ match: matchView(match, id) });
    }

    case "sync": {
      const matchId = str(body.matchId);
      const match = parse<Match>(await store.get(`match:${matchId}`));
      if (!match || !match.players.some((p) => p.id === id)) return { status: 404, json: { error: "Unknown match" } };
      const mine = (body.progress ?? {}) as Body;
      const lives = Math.max(0, Math.min(3, Math.floor(Number(mine.lives) || 0)));
      const progress: Progress = {
        correct: Math.max(0, Math.min(1000, Math.floor(Number(mine.correct) || 0))),
        score: Math.max(0, Math.min(1_000_000, Math.floor(Number(mine.score) || 0))),
        lives,
        answered: Math.max(0, Math.min(1000, Math.floor(Number(mine.answered) || 0))),
        died: mine.died === true && lives === 0,
        finished: mine.finished === true,
        ts: now,
      };
      const previous = parse<Progress>(await store.get(`progress:${matchId}:${id}`));
      // A finished result is final; later heartbeats only refresh the timestamp.
      const saved: Progress = previous?.finished ? { ...previous, ts: now } : progress.finished ? { ...progress, finishedAt: now } : progress;
      await store.set(`progress:${matchId}:${id}`, JSON.stringify(saved), MATCH_TTL_SECONDS);
      const others = [];
      for (const player of match.players) {
        if (player.id === id) continue;
        const theirs = parse<Progress>(await store.get(`progress:${matchId}:${player.id}`));
        const fallback: Progress = { correct: 0, score: 0, lives: 3, answered: 0, died: false, finished: false, ts: match.startAt };
        const value = theirs ?? fallback;
        others.push({ name: player.name, ...value, age: now - Math.max(value.ts, match.startAt - START_DELAY) });
      }
      return ok({ me: saved, others, sinceStart: now - match.startAt });
    }

    case "partyCreate": {
      const name = str(body.name, 16);
      const settings = parseSettings(body.settings);
      const password = str(body.password, 32);
      if (!validName(name) || !settings) return bad("Invalid party");
      for (const [partyId, raw] of Object.entries(await store.hGetAll("parties"))) {
        const existing = parse<Party>(raw);
        if (!existing || existing.host.id === id || now - existing.ts > PRESENCE_TTL) await store.hDel("parties", partyId);
      }
      const salt = randomId();
      const party: Party = { id: randomId(), host: { id, name }, salt, hash: hashPassword(salt, password), settings, members: [{ id, name, ts: now }], status: "lobby", ts: now };
      await writeParty(store, party);
      return ok({ party: partyView(party) });
    }

    case "partyList": {
      const parties = [];
      for (const [partyId, raw] of Object.entries(await store.hGetAll("parties"))) {
        const party = parse<Party>(raw);
        if (!party || now - party.ts > PRESENCE_TTL) await store.hDel("parties", partyId);
        else if (party.status === "lobby") parties.push(partyView(party));
      }
      return ok({ parties });
    }

    case "partyJoin": {
      const name = str(body.name, 16);
      const party = await readParty(store, str(body.partyId));
      if (!validName(name) || !party || party.status !== "lobby") return { status: 404, json: { error: "not_found" } };
      if (party.hash && hashPassword(party.salt, str(body.password, 32)) !== party.hash) return { status: 403, json: { error: "wrong_password" } };
      party.members = party.members.filter((m) => m.id === party.host.id || m.id === id || now - m.ts <= PRESENCE_TTL);
      if (party.members.some((m) => m.name === name && m.id !== id)) return { status: 409, json: { error: "name_taken" } };
      if (!party.members.some((m) => m.id === id)) {
        if (party.members.length >= MAX_PARTY) return { status: 409, json: { error: "party_full" } };
        party.members.push({ id, name, ts: now });
      }
      await writeParty(store, party);
      return ok({ party: partyView(party) });
    }

    case "partyState": {
      const party = await readParty(store, str(body.partyId));
      if (!party || !party.members.some((m) => m.id === id)) return ok({ status: "gone" });
      if (party.status === "lobby" && id !== party.host.id && now - party.ts > PRESENCE_TTL) {
        await store.hDel("parties", party.id);
        return ok({ status: "gone" });
      }
      if (party.status === "started" && party.matchId) {
        const match = parse<Match>(await store.get(`match:${party.matchId}`));
        if (match) return ok({ status: "started", match: matchView(match, id) });
      }
      const me = party.members.find((m) => m.id === id)!;
      me.ts = now;
      if (id === party.host.id) party.ts = now;
      party.members = party.members.filter((m) => m.id === party.host.id || now - m.ts <= PRESENCE_TTL);
      await writeParty(store, party);
      return ok({ status: "lobby", party: partyView(party) });
    }

    case "partyLeave": {
      const party = await readParty(store, str(body.partyId));
      if (party) {
        if (party.host.id === id) await store.hDel("parties", party.id);
        else {
          party.members = party.members.filter((m) => m.id !== id);
          await writeParty(store, party);
        }
      }
      return ok({ ok: true });
    }

    case "partyStart": {
      const party = await readParty(store, str(body.partyId));
      if (!party || party.host.id !== id || party.status !== "lobby") return { status: 404, json: { error: "not_found" } };
      const members = party.members.filter((m) => m.id === id || now - m.ts <= PRESENCE_TTL);
      if (members.length < 2) return bad("need_players");
      const match = await createMatch(store, members.map((m) => ({ id: m.id, name: m.name })), party.settings, "party");
      party.status = "started";
      party.matchId = match.id;
      party.members = members;
      await writeParty(store, party);
      return ok({ match: matchView(match, id) });
    }
    default:
      return bad("Unknown action");
  }
}

export function memoryStore(): Store {
  const kv = new Map<string, { value: string; expires: number }>();
  const hashes = new Map<string, Map<string, string>>();
  const hash = (key: string) => hashes.get(key) ?? hashes.set(key, new Map()).get(key)!;
  return {
    async get(key) {
      const entry = kv.get(key);
      if (!entry || entry.expires < Date.now()) return null;
      return entry.value;
    },
    async set(key, value, ttl) {
      kv.set(key, { value, expires: Date.now() + ttl * 1000 });
    },
    async hGetAll(key) {
      return Object.fromEntries(hash(key));
    },
    async hSet(key, field, value) {
      hash(key).set(field, value);
    },
    async hDel(key, field) {
      return hash(key).delete(field) ? 1 : 0;
    },
  };
}
