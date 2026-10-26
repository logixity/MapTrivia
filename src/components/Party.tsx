import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Language, text } from "../i18n";
import { DuelMatch, PartyInfo, DuelSettings, duelApi } from "../duel";
import Singleplayer from "./Singleplayer";

const ERRORS: Record<string, string> = { wrong_password: "wrongPassword", party_full: "partyFull", name_taken: "nameTaken", not_found: "partyGone" };

function errorText(language: Language, error: unknown) {
  const key = ERRORS[error instanceof Error ? error.message : ""];
  return key ? text(language, key) : text(language, "unavailable");
}

export function PartyMenu({ language, onCreate, onJoin, onBack }: { language: Language; onCreate: () => void; onJoin: () => void; onBack: () => void }) {
  const cards = [
    { icon: "🎉", title: "createParty", action: onCreate },
    { icon: "🚪", title: "joinParty", action: onJoin },
  ];
  return (
    <div className="menu">
      <h2 className="step-title">{text(language, "parties")}</h2>
      <p className="notice">{text(language, "lastStanding")}</p>
      <div className="mode-grid">
        {cards.map((card, i) => (
          <motion.button key={card.title} className="mode-card" onClick={card.action} initial={{ opacity: 0, y: 30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18, delay: i * 0.08 }} whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.96 }}>
            <span className="mode-icon">{card.icon}</span>
            <strong>{text(language, card.title)}</strong>
          </motion.button>
        ))}
      </div>
      <div className="wizard-nav">
        <button className="ghost" onClick={onBack}>← {text(language, "back")}</button>
      </div>
    </div>
  );
}

export function CreateParty({ language, name, onCreated, onBack }: { language: Language; name: string; onCreated: (party: PartyInfo) => void; onBack: () => void }) {
  const [password, setPassword] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  async function create(settings: DuelSettings) {
    try {
      const data = await duelApi<{ party: PartyInfo }>("partyCreate", { name, password, settings });
      onCreated(data.party);
    } catch (e) {
      setError(errorText(language, e));
      setPassword(null);
    }
  }

  if (password === null) {
    return (
      <div className="menu">
        <h2 className="step-title">{text(language, "createParty")}</h2>
        {error && <p className="notice">{error}</p>}
        <label className="option-label">{text(language, "partyPassword")}</label>
        <input className="name-input" type="text" maxLength={32} placeholder={text(language, "passwordOptional")} value={draft} onKeyDown={(e) => e.key === "Enter" && setPassword(draft)} onChange={(e) => setDraft(e.target.value)} autoFocus />
        <div className="wizard-nav">
          <button className="ghost" onClick={onBack}>← {text(language, "back")}</button>
          <button className="play" onClick={() => setPassword(draft)}>{text(language, "next")}</button>
        </div>
      </div>
    );
  }
  return <Singleplayer language={language} finishLabel={text(language, "create")} onBack={() => setPassword(null)} onStart={(s) => create({ mode: s.mode, continent: s.continent, timeLimit: s.timeLimit })} />;
}

export function JoinParty({ language, name, onJoined, onBack }: { language: Language; name: string; onJoined: (party: PartyInfo) => void; onBack: () => void }) {
  const [parties, setParties] = useState<PartyInfo[]>([]);
  const [picked, setPicked] = useState<PartyInfo | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let stopped = false;
    async function load() {
      try {
        const data = await duelApi<{ parties: PartyInfo[] }>("partyList");
        if (!stopped) setParties(data.parties);
      } catch {
        if (!stopped) setParties([]);
      }
    }
    load();
    const timer = setInterval(load, 2500);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, []);

  async function join(party: PartyInfo, pass: string) {
    setError("");
    try {
      const data = await duelApi<{ party: PartyInfo }>("partyJoin", { name, partyId: party.id, password: pass });
      onJoined(data.party);
    } catch (e) {
      setError(errorText(language, e));
    }
  }

  function choose(party: PartyInfo) {
    setError("");
    setPassword("");
    if (party.hasPassword) setPicked(party);
    else join(party, "");
  }

  return (
    <div className="menu">
      <h2 className="step-title">{text(language, "joinParty")}</h2>
      {error && <p className="notice">{error}</p>}
      {picked ? (
        <div className="party-password">
          <p className="option-label">{text(language, "enterPassword")} — {picked.host}</p>
          <input className="name-input" type="password" maxLength={32} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && join(picked, password)} autoFocus />
          <div className="wizard-nav">
            <button className="ghost" onClick={() => setPicked(null)}>← {text(language, "back")}</button>
            <button className="play" onClick={() => join(picked, password)}>{text(language, "join")}</button>
          </div>
        </div>
      ) : (
        <>
          <div className="party-list">
            {parties.length === 0 && <p className="notice">{text(language, "noParties")}</p>}
            {parties.map((party, i) => (
              <motion.button key={party.id} className="party-row" onClick={() => choose(party)} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <span>{party.hasPassword ? "🔒" : "🔓"}</span>
                <strong>{party.host}</strong>
                <small>{party.settings.continent} · {party.settings.timeLimit}s · {party.members.length}/8</small>
                <span className="party-join">{text(language, "join")}</span>
              </motion.button>
            ))}
          </div>
          <div className="wizard-nav">
            <button className="ghost" onClick={onBack}>← {text(language, "back")}</button>
          </div>
        </>
      )}
    </div>
  );
}

export function PartyLobby({ language, party: initial, you, onStart, onLeave }: { language: Language; party: PartyInfo; you: string; onStart: (match: DuelMatch) => void; onLeave: () => void }) {
  const [party, setParty] = useState(initial);
  const [error, setError] = useState("");
  const left = useRef(false);
  const host = party.host === you;

  useEffect(() => {
    let stopped = false;
    async function poll() {
      try {
        const data = await duelApi<{ status: "gone" | "lobby" | "started"; party?: PartyInfo; match?: DuelMatch }>("partyState", { partyId: initial.id });
        if (stopped) return;
        if (data.status === "started" && data.match) onStart(data.match);
        else if (data.status === "gone") {
          left.current = true;
          setError(text(language, "partyGone"));
          setTimeout(onLeave, 1500);
        } else if (data.party) setParty(data.party);
      } catch {
        // Retry on the next tick.
      }
    }
    poll();
    const timer = setInterval(poll, 1500);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [initial.id]);

  async function start() {
    try {
      const data = await duelApi<{ match: DuelMatch }>("partyStart", { partyId: party.id });
      onStart(data.match);
    } catch {
      setError(text(language, "needTwo"));
    }
  }

  async function leave() {
    left.current = true;
    await duelApi("partyLeave", { partyId: party.id }).catch(() => undefined);
    onLeave();
  }

  return (
    <div className="menu">
      <h2 className="step-title">{text(language, "lobby")}</h2>
      <p className="notice">{party.hasPassword ? "🔒 " : ""}{party.settings.continent} · {party.settings.timeLimit}s · {text(language, "lastStanding")}</p>
      {error && <p className="notice">{error}</p>}
      <p className="option-label">{text(language, "partyMembers")} ({party.members.length}/8)</p>
      <div className="standings">
        {party.members.map((member, i) => (
          <motion.div key={member} className={`standing ${member === you ? "me" : ""}`} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
            <span className="rank">{member === party.host ? "👑" : "🎮"}</span>
            <span className="board-name">{member}</span>
          </motion.div>
        ))}
      </div>
      <div className="wizard-nav">
        <button className="ghost" onClick={leave}>{text(language, "leaveParty")}</button>
        {host ? (
          <button className="play" disabled={party.members.length < 2} onClick={start}>{party.members.length < 2 ? text(language, "needTwo") : text(language, "startParty")}</button>
        ) : (
          <span className="waiting-note">⏳ {text(language, "waitingHost")}</span>
        )}
      </div>
    </div>
  );
}
