import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Language, text } from "../i18n";
import { DuelMatch, Progress, duelApi, FORFEIT_AFTER_MS } from "../duel";
import Burst from "./Burst";
import Lives from "./Lives";

interface Props {
  language: Language;
  you: string;
  match: DuelMatch;
  score: number;
  correct: number;
  lives: number;
  answered: number;
  onMenu: () => void;
}

interface Row {
  name: string;
  me: boolean;
  correct: number;
  score: number;
  lives: number;
  answered: number;
  finished: boolean;
  out: boolean;
  survivor: boolean;
  finishedAt: number;
}

export default function DuelResults({ language, you, match, score, correct, lives, answered, onMenu }: Props) {
  const [others, setOthers] = useState<Progress[]>([]);
  const [mine, setMine] = useState<Progress | null>(null);
  const [synced, setSynced] = useState(false);
  const [decided, setDecided] = useState(false);
  const party = match.kind === "party";

  useEffect(() => {
    if (decided) return;
    let stopped = false;
    async function sync() {
      try {
        const data = await duelApi<{ me: Progress; others: Progress[] }>("sync", { matchId: match.id, progress: { correct, score, lives, answered, died: lives <= 0, finished: true } });
        if (stopped) return;
        setOthers(data.others);
        setMine(data.me);
        setSynced(true);
        // The game is over once every other player is eliminated or gone.
        if (data.others.every((p) => p.finished || (p.age ?? 0) > FORFEIT_AFTER_MS)) setDecided(true);
      } catch {
        // Retry on the next tick.
      }
    }
    sync();
    const timer = setInterval(sync, 1500);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [match.id, correct, score, lives, answered, decided]);

  // Survivors rank first; eliminated players rank by how long they lasted, then correct answers, then score.
  const rows: Row[] = useMemo(() => {
    const all: Row[] = [
      { name: you, me: true, correct, score, lives, answered, finished: true, out: lives <= 0, survivor: lives > 0, finishedAt: mine?.finishedAt ?? 0 },
      ...others.map((p) => {
        const forfeit = !p.finished && (p.age ?? 0) > FORFEIT_AFTER_MS;
        const out = p.died || forfeit;
        return { name: p.name ?? "?", me: false, correct: p.correct, score: p.score, lives: p.lives, answered: p.answered, finished: p.finished, out, survivor: !out, finishedAt: p.finishedAt ?? 0 };
      }),
    ];
    return all.sort((a, b) => Number(b.survivor) - Number(a.survivor) || b.answered - a.answered || b.correct - a.correct || b.score - a.score || b.finishedAt - a.finishedAt);
  }, [others, you, correct, score, lives, answered, mine]);

  const top = rows[0];
  const tie = rows.length > 1 && top.survivor === rows[1].survivor && top.answered === rows[1].answered && top.correct === rows[1].correct && top.score === rows[1].score;
  const outcome = !decided || !synced ? null : tie && !party ? "draw" : top.me ? "win" : "lose";
  const icon = outcome === "win" ? "🏆" : outcome === "lose" ? "💀" : outcome === "draw" ? "🤝" : "⏳";
  const title = outcome === "win" ? (party ? "partyWin" : "youWin") : outcome === "lose" ? (party ? "partyOut" : "youLose") : outcome === "draw" ? "drawResult" : party ? "waitingGameEnd" : "waitingOpponent";

  return (
    <div className="results duel-results">
      <motion.div className="trophy" key={icon} initial={{ scale: 0, rotate: -30 }} animate={outcome ? { scale: 1, rotate: 0 } : { scale: 1, rotate: [0, 15, -15, 0] }} transition={outcome ? { type: "spring", stiffness: 180, damping: 10 } : { repeat: Infinity, duration: 2 }}>
        {icon}
      </motion.div>
      {outcome === "win" && <Burst count={28} />}
      <motion.h2 key={title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>{text(language, title)}</motion.h2>

      <p className="option-label">{text(language, "standings")}</p>
      <div className="standings">
        {rows.map((row, i) => (
          <motion.div key={row.name} layout className={`standing ${row.me ? "me" : ""} ${row.out ? "out" : ""}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
            <span className="rank">{decided && row.survivor && i === 0 ? "🥇" : row.out && decided ? i + 1 : row.out ? "💀" : "⚔️"}</span>
            <span className="board-name">{row.name}</span>
            <span className="standing-stat">✓ {row.correct}</span>
            <span className="standing-stat">{row.score}</span>
            {!row.out && <Lives lives={row.lives} small />}
          </motion.div>
        ))}
      </div>

      <div className="results-actions">
        <button className="play" onClick={onMenu}>{text(language, "menu")}</button>
      </div>
    </div>
  );
}
