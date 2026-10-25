import { useEffect, useState } from "react";
import { animate, motion } from "framer-motion";
import { MODES, MODE_KEYS, Settings } from "../game";
import { text } from "../i18n";
import { submitScore } from "../leaderboard";

interface Props {
  settings: Settings;
  username: string;
  score: number;
  best: number;
  correctCount: number;
  onAgain: () => void;
  onMenu: () => void;
}

export default function Results({ settings, username, score, best, correctCount, onAgain, onMenu }: Props) {
  const key = `maptrivia-best-${settings.mode}`;
  const [shown, setShown] = useState(0);
  const [record] = useState(() => {
    const prev = Number(localStorage.getItem(key) ?? 0);
    if (score > prev) localStorage.setItem(key, String(score));
    return { prev, isNew: score > prev };
  });

  useEffect(() => {
    submitScore(username, settings.mode, score);
  }, [username, settings.mode, score]);

  useEffect(() => {
    const controls = animate(0, score, { duration: 1.2, onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [score]);

  const mode = MODES.find((m) => m.id === settings.mode)!;
  const modeKeys = MODE_KEYS;

  return (
    <div className="results">
      <motion.div className="trophy" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 180, damping: 10 }}>
        {record.isNew ? "🏆" : "🎉"}
      </motion.div>
      <h2>{record.isNew ? text(settings.language, "newRecord") : text(settings.language, "gameOver")}</h2>
      <p className="subtitle">{text(settings.language, modeKeys[mode.id])}</p>
      <div className="final-score">{shown}</div>
      <p className="result-stats">✓ {correctCount} / {settings.rounds}</p>
      <p className="subtitle">{text(settings.language, "bestStreak")}: {best} · {text(settings.language, "personalBest")}: {Math.max(record.prev, score)}</p>
      <div className="results-actions">
        <motion.button className="play" whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }} onClick={onAgain}>
          {text(settings.language, "again")}
        </motion.button>
        <button className="ghost" onClick={onMenu}>
          {text(settings.language, "menu")}
        </button>
      </div>
    </div>
  );
}
