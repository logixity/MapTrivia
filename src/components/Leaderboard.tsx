import { useEffect, useState } from "react";
import { MODES, MODE_KEYS } from "../game";
import { Language, text } from "../i18n";
import { BoardKey, Entry, fetchBoard } from "../leaderboard";

interface Props {
  language: Language;
  username: string;
  onBack: () => void;
}

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

  return (
    <div className="menu">
      <h2 className="step-title">🏆 {text(language, "leaderboard")}</h2>
      <div className="chip-row">
        <button className={`chip ${board === "all" ? "active" : ""}`} onClick={() => setBoard("all")}>{text(language, "overall")}</button>
        {MODES.map((m) => (
          <button key={m.id} className={`chip ${board === m.id ? "active" : ""}`} onClick={() => setBoard(m.id)}>{text(language, MODE_KEYS[m.id])}</button>
        ))}
      </div>

      <ol className="board">
        {entries === null && <li className="board-empty">…</li>}
        {entries?.length === 0 && <li className="board-empty">{text(language, "noScores")}</li>}
        {entries?.slice(0, 50).map((entry, i) => (
          <li key={entry.name} className={entry.name === username ? "me" : ""}>
            <span className="rank">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</span>
            <span className="board-name">{entry.name}</span>
            <b>{entry.score}</b>
          </li>
        ))}
      </ol>
      {entries && !online && <p className="subtitle">{text(language, "localOnly")}</p>}

      <div className="wizard-nav">
        <button className="ghost" onClick={onBack}>← {text(language, "back")}</button>
      </div>
    </div>
  );
}
