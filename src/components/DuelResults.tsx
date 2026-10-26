import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Language, text } from "../i18n";
import { duelApi, FORFEIT_AFTER_MS, Progress } from "../duel";
import Burst from "./Burst";
import Lives from "./Lives";

interface Props {
  language: Language;
  you: string;
  opponent: string;
  matchId: string;
  score: number;
  correct: number;
  onMenu: () => void;
}

export default function DuelResults({ language, you, opponent, matchId, score, correct, onMenu }: Props) {
  const [theirs, setTheirs] = useState<Progress | null>(null);
  const [forfeit, setForfeit] = useState(false);
  const [decided, setDecided] = useState(false);

  useEffect(() => {
    if (decided) return;
    let stopped = false;
    async function sync() {
      try {
        const data = await duelApi<{ opponent: Progress | null; sinceStart: number }>("sync", { matchId, progress: { correct, score, lives: 0, finished: true } });
        if (stopped) return;
        setTheirs(data.opponent);
        if (data.opponent?.finished) setDecided(true);
        else if ((data.opponent?.age ?? data.sinceStart) > FORFEIT_AFTER_MS) {
          setForfeit(true);
          setDecided(true);
        }
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
  }, [matchId, correct, score, decided]);

  // Surviving longer means more correct answers before the third life is lost; score breaks ties.
  const outcome = !decided ? null : forfeit || !theirs ? "win" : correct !== theirs.correct ? (correct > theirs.correct ? "win" : "lose") : score !== theirs.score ? (score > theirs.score ? "win" : "lose") : "draw";
  const icon = outcome === "win" ? "🏆" : outcome === "lose" ? "💀" : outcome === "draw" ? "🤝" : "⏳";
  const title = outcome === "win" ? "youWin" : outcome === "lose" ? "youLose" : outcome === "draw" ? "drawResult" : "waitingOpponent";

  return (
    <div className="results duel-results">
      <motion.div className="trophy" key={icon} initial={{ scale: 0, rotate: -30 }} animate={outcome ? { scale: 1, rotate: 0 } : { scale: 1, rotate: [0, 15, -15, 0] }} transition={outcome ? { type: "spring", stiffness: 180, damping: 10 } : { repeat: Infinity, duration: 2 }}>
        {icon}
      </motion.div>
      {outcome === "win" && <Burst count={28} />}
      <motion.h2 key={title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>{text(language, title)}</motion.h2>
      {forfeit && <p className="subtitle">{text(language, "opponentLeft")}</p>}

      <div className="duel-table">
        <div className="duel-col you">
          <strong>{you}</strong>
          <span className="big">{correct}</span>
          <small>{text(language, "survivedFor")}</small>
          <span>{text(language, "finalScore")}: {score}</span>
        </div>
        <div className="duel-col">
          <strong>{opponent}</strong>
          <span className="big">{theirs?.correct ?? 0}</span>
          <small>{text(language, "survivedFor")}</small>
          <span>{text(language, "finalScore")}: {theirs?.score ?? 0}</span>
          {!decided && theirs && <Lives lives={theirs.lives} small />}
        </div>
      </div>

      <div className="results-actions">
        <button className="play" onClick={onMenu}>{text(language, "menu")}</button>
      </div>
    </div>
  );
}
