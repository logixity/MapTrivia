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
interface Match { id: string; settings: DuelSettings; seed: number; players: [Player, Player]; startAt: number }
interface Invite { id: string; from: Player; to: string; settings: DuelSettings; status: "pending" | "accepted" | "declined" | "cancelled"; matchId?: string; ts: number }
interface Progress { correct: number; score: number; lives: number; finished: boolean; finishedAt?: number; ts: number }

const MODES = ["flag-country", "country-capital", "capital-country", "country-flag", "draw-flag", "map-country", "country-map", "pin-country", "pin-capital", "pin-flag"];
const CONTINENTS = ["All", "Europe", "Asia", "Africa", "North America", "South America", "Oceania"];
const TIME_LIMITS = [0, 10, 15, 30, 60];

const PRESENCE_TTL = 15_000;
const QUEUE_TTL = 8_000;
const INVITE_TTL = 60_000;
const START_DELAY = 4_000;
const MATCH_TTL_SECONDS = 3600;

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

async function createMatch(store: Store, a: Player, b: Player, settings: DuelSettings): Promise<Match> {
  const match: Match = { id: randomId(), settings, seed: Math.floor(Math.random() * 2 ** 31), players: [a, b], startAt: Date.now() + START_DELAY };
  await store.set(`match:${match.id}`, JSON.stringify(match), MATCH_TTL_SECONDS);
  return match;
}

function matchView(match: Match, myId: string) {
  const opponent = match.players.find((p) => p.id !== myId) ?? match.players[1];
  return { id: match.id, settings: match.settings, seed: match.seed, opponent: opponent.name, startIn: Math.max(0, match.startAt - Date.now()) };
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
        const match = await createMatch(store, opponent, { id, name }, settings);
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
      const match = await createMatch(store, invite.from, { id, name }, invite.settings);
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
      const progress: Progress = {
        correct: Math.max(0, Math.min(1000, Math.floor(Number(mine.correct) || 0))),
        score: Math.max(0, Math.min(1_000_000, Math.floor(Number(mine.score) || 0))),
        lives: Math.max(0, Math.min(3, Math.floor(Number(mine.lives) || 0))),
        finished: mine.finished === true,
        ts: now,
      };
      const previous = parse<Progress>(await store.get(`progress:${matchId}:${id}`));
      // A finished result is final; later heartbeats only refresh the timestamp.
      const saved: Progress = previous?.finished ? { ...previous, ts: now } : progress.finished ? { ...progress, finishedAt: now } : progress;
      await store.set(`progress:${matchId}:${id}`, JSON.stringify(saved), MATCH_TTL_SECONDS);
      const other = match.players.find((p) => p.id !== id)!;
      const theirs = parse<Progress>(await store.get(`progress:${matchId}:${other.id}`));
      return ok({ me: saved, opponent: theirs ? { ...theirs, age: now - theirs.ts } : null, sinceStart: now - match.startAt });
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
