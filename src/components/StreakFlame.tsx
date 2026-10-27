import { motion } from "framer-motion";

const RAYS = 16;
const SPARKS = 18;
const EMBERS = 12;

// 0 = no streak effects, 4 = the top tier.
export function streakLevel(streak: number): number {
  return streak >= 12 ? 4 : streak >= 8 ? 3 : streak >= 5 ? 2 : streak >= 3 ? 1 : 0;
}

interface Props {
  streak: number;
  bonus: number;
  label: string;
  title: string;
}

export default function StreakFlame({ streak, bonus, label, title }: Props) {
  const level = Math.max(1, streakLevel(streak));
  return (
    <div className={`streak-flame lvl-${level}`}>
      <motion.div className="streak-ring" initial={{ scale: 0.2, opacity: 0.9 }} animate={{ scale: 2.4, opacity: 0 }} transition={{ delay: 0.5, duration: 0.9, ease: "easeOut" }} />
      <motion.div className="streak-ring" initial={{ scale: 0.2, opacity: 0.7 }} animate={{ scale: 3.2, opacity: 0 }} transition={{ delay: 0.65, duration: 1.1, ease: "easeOut" }} />

      <motion.div className="streak-rays" initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: [0, 0.95, 0.55], scale: 1 + level * 0.1, rotate: 360 }} transition={{ opacity: { duration: 0.6 }, scale: { delay: 0.5, type: "spring", stiffness: 120, damping: 12 }, rotate: { repeat: Infinity, duration: 9, ease: "linear" } }}>
        {Array.from({ length: RAYS }, (_, i) => <span key={i} style={{ transform: `rotate(${(i / RAYS) * 360}deg)` }} />)}
      </motion.div>

      <div className="streak-sparks" aria-hidden>
        {Array.from({ length: SPARKS }, (_, i) => {
          const angle = (i / SPARKS) * Math.PI * 2;
          const distance = 70 + (i % 4) * 22 + level * 10;
          return (
            <motion.span key={i} initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }} animate={{ x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, opacity: [0, 1, 0], scale: [0.4, 1.2, 0] }} transition={{ delay: 0.55 + (i % 5) * 0.05, duration: 1, repeat: Infinity, repeatDelay: 0.5, ease: "easeOut" }} />
          );
        })}
      </div>

      <motion.div className="streak-icon" initial={{ scale: 0, rotate: -25, y: 30 }} animate={{ scale: [0, 1.7, 0.9, 1], rotate: [-25, 10, -5, 0], y: 0 }} transition={{ delay: 0.5, duration: 0.8, times: [0, 0.5, 0.78, 1] }}>
        <motion.span className="streak-emoji" style={{ fontSize: `${5.8 + level * 0.5}rem` }} animate={{ scale: [1, 1.1, 0.96, 1.07, 1], rotate: [0, -4, 4, -2, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: 1.2 }}>🔥</motion.span>
        <motion.span className="streak-number" key={streak} initial={{ scale: 0, y: 12 }} animate={{ scale: [0, 1.8, 1], y: 0 }} transition={{ delay: 0.75, duration: 0.55 }}>{streak}</motion.span>
      </motion.div>

      <div className="streak-embers" aria-hidden>
        {Array.from({ length: EMBERS }, (_, i) => (
          <motion.span key={i} style={{ left: `calc(50% + ${(i - EMBERS / 2) * 18 + (i % 2) * 7}px)` }} initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 0], y: [0, -80 - (i % 4) * 22], x: [0, (i % 2 ? 14 : -14)], scale: [0.5, 1, 0.3] }} transition={{ delay: 0.8 + i * 0.09, duration: 1.2, repeat: Infinity, ease: "easeOut" }}>{i % 3 === 0 ? "🔥" : "✨"}</motion.span>
        ))}
      </div>

      <motion.div className="streak-title" initial={{ opacity: 0, scale: 0.3, rotate: -6 }} animate={{ opacity: 1, scale: [0.3, 1.25, 1], rotate: [-6, 3, 0] }} transition={{ delay: 0.85, duration: 0.55 }}>
        {title}
      </motion.div>

      <motion.div className="streak-text" initial={{ opacity: 0, y: 14, scale: 0.7 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 1.05, type: "spring", stiffness: 260, damping: 14 }}>
        {label} ×{streak} · +{bonus}
      </motion.div>
    </div>
  );
}
