import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Language, text } from "../i18n";
import { DuelMatch, DuelSettings, duelApi } from "../duel";

interface Props {
  language: Language;
  name: string;
  settings: DuelSettings;
  online: string[];
  onMatch: (match: DuelMatch) => void;
  onBack: () => void;
}

type Outcome = "declined" | "expired" | "error" | null;

export default function PlayerPicker({ language, name, settings, online, onMatch, onBack }: Props) {
  const [query, setQuery] = useState("");
  const onMatchRef = useRef(onMatch);
  onMatchRef.current = onMatch;
  const [inviting, setInviting] = useState<{ to: string; inviteId: string } | null>(null);
  const [outcome, setOutcome] = useState<{ kind: Outcome; to: string } | null>(null);

  useEffect(() => {
    if (!inviting) return;
    let stopped = false;
    async function poll() {
      try {
        const data = await duelApi<{ status: string; match?: DuelMatch }>("inviteStatus", { inviteId: inviting!.inviteId });
        if (stopped) return;
        if (data.status === "accepted" && data.match) onMatchRef.current(data.match);
        else if (data.status === "declined" || data.status === "expired" || data.status === "cancelled") {
          setOutcome({ kind: data.status === "declined" ? "declined" : "expired", to: inviting!.to });
          setInviting(null);
        }
      } catch {
        // Retry on the next tick.
      }
    }
    const timer = setInterval(poll, 1500);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [inviting]);

  async function challenge(to: string) {
    setOutcome(null);
    try {
      const data = await duelApi<{ inviteId: string }>("invite", { name, to, settings });
      setInviting({ to, inviteId: data.inviteId });
    } catch {
      setOutcome({ kind: "error", to });
    }
  }

  function cancelInvite() {
    if (inviting) duelApi("cancelInvite", { inviteId: inviting.inviteId }).catch(() => {});
    setInviting(null);
  }

  const players = online.filter((player) => player.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="menu picker">
      <h2 className="step-title">{text(language, "chooseOpponent")}</h2>

      {inviting ? (
        <div className="waiting-invite">
          <motion.div className="spinner" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>⏳</motion.div>
          <p>{text(language, "waitingAccept").replace("{name}", inviting.to)}</p>
          <button className="ghost" onClick={cancelInvite}>✕ {text(language, "cancel")}</button>
        </div>
      ) : (
        <>
          <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text(language, "search")} maxLength={16} />
          <AnimatePresence>
            {outcome && (
              <motion.p className="notice" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {outcome.kind === "declined" ? text(language, "declined").replace("{name}", outcome.to) : outcome.kind === "expired" ? text(language, "expired") : text(language, "unavailable")}
              </motion.p>
            )}
          </AnimatePresence>
          <p className="option-label">{text(language, "playersOnline")} ({online.length})</p>
          <div className="player-list">
            {players.length === 0 && <p className="subtitle">{text(language, "noPlayers")}</p>}
            <AnimatePresence initial={false}>
              {players.map((player) => (
                <motion.div key={player} className="player-row" layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <span>🟢 {player}</span>
                  <button className="play small" onClick={() => challenge(player)}>⚔️ {text(language, "challenge")}</button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="wizard-nav">
            <button className="ghost" onClick={onBack}>← {text(language, "back")}</button>
          </div>
        </>
      )}
    </div>
  );
}
