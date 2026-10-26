import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MODES, MODE_KEYS } from "../game";
import { Language, text } from "../i18n";
import { BoardKey, Entry, fetchBoard } from "../leaderboard";

interface Props {
  language: Language;
  username: string;
  onBack: () => void;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard({ language, username, onBack }: Props) {
  const [board, setBoard] = useState<BoardKey>("all");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setEntries(null);
    fetchBoard(board).then((result) => {
      if (cancelled) return;
      setEntries(result.entries);
      setOnline(result.online);
    });
    return () => { cancelled = true; };
  }, [board]);

  const top = entries?.slice(0, 3) ?? [];
  const rest = entries?.slice(3, 50) ?? [];
  // Podium order: 2nd, 1st, 3rd.
  const podium = [1, 0, 2].filter((i) => top[i]);
  const myRank = entries ? entries.findIndex((entry) => entry.name === username) : -1;

  return (
    <div className="menu leaderboard">
      <h2 className="step-title">🏆 {text(language, "leaderboard")}</h2>

      <select className="board-select" value={board} onChange={(event) => setBoard(event.target.value as BoardKey)} aria-label={text(language, "leaderboard")}>
        <option value="all">{text(language, "overall")}</option>
        {MODES.map((m) => <option key={m.id} value={m.id}>{text(language, MODE_KEYS[m.id])}</option>)}
      </select>
      <p className="board-rule">{text(language, "boardRule")}</p>

      {entries === null && <p className="subtitle">…</p>}
      {entries?.length === 0 && <p className="subtitle">{text(language, "noScores")}</p>}

      {top.length > 0 && (
        <div className="podium">
          {podium.map((i) => (
            <motion.div key={top[i].name} className={`podium-slot place-${i + 1} ${top[i].name === username ? "me" : ""}`} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 16, delay: i === 0 ? 0.25 : i === 1 ? 0.1 : 0.4 }}>
              <span className="podium-medal">{MEDALS[i]}</span>
              <span className="podium-name">{top[i].name}</span>
              <b>{top[i].score}</b>
              <div className="podium-bar" />
            </motion.div>
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <ol className="board" start={4}>
          {rest.map((entry, i) => (
            <motion.li key={entry.name} className={entry.name === username ? "me" : ""} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
              <span className="rank">{i + 4}</span>
              <span className="board-name">{entry.name}</span>
              <b>{entry.score}</b>
            </motion.li>
          ))}
        </ol>
      )}

      {myRank >= 50 && <p className="subtitle">#{myRank + 1} · {username}</p>}
      {entries && !online && <p className="subtitle">{text(language, "localOnly")}</p>}

      <div className="wizard-nav">
        <button className="ghost" onClick={onBack}>← {text(language, "back")}</button>
      </div>
    </div>
  );
}
