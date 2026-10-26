import { motion } from "framer-motion";

const RAYS = 12;
const EMBERS = [-54, -34, -14, 8, 30, 52];

export default function StreakFlame({ streak, bonus, label }: { streak: number; bonus: number; label: string }) {
  const big = streak >= 5;
  return (
    <div className={`streak-flame ${big ? "big" : ""}`}>
      <motion.div className="streak-rays" initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: [0, 0.9, 0.5], scale: 1, rotate: 360 }} transition={{ opacity: { duration: 0.6 }, scale: { delay: 0.5, type: "spring", stiffness: 120, damping: 12 }, rotate: { repeat: Infinity, duration: 10, ease: "linear" } }}>
        {Array.from({ length: RAYS }, (_, i) => <span key={i} style={{ transform: `rotate(${(i / RAYS) * 360}deg)` }} />)}
      </motion.div>

      <motion.div className="streak-icon" initial={{ scale: 0, rotate: -25, y: 30 }} animate={{ scale: [0, 1.5, 0.92, 1], rotate: [-25, 8, -4, 0], y: 0 }} transition={{ delay: 0.5, duration: 0.7, times: [0, 0.5, 0.78, 1] }}>
        <motion.span className="streak-emoji" animate={{ scale: [1, 1.08, 0.97, 1.05, 1], rotate: [0, -3, 3, -2, 0] }} transition={{ repeat: Infinity, duration: 1.1, delay: 1.2 }}>🔥</motion.span>
        <motion.span className="streak-number" key={streak} initial={{ scale: 0, y: 12 }} animate={{ scale: [0, 1.6, 1], y: 0 }} transition={{ delay: 0.75, duration: 0.5 }}>{streak}</motion.span>
      </motion.div>

      <div className="streak-embers" aria-hidden>
        {EMBERS.map((left, i) => (
          <motion.span key={i} style={{ left: `calc(50% + ${left}px)` }} initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 0], y: [0, -70 - (i % 3) * 18], scale: [0.5, 1, 0.3] }} transition={{ delay: 0.9 + i * 0.12, duration: 1.1, repeat: Infinity, ease: "easeOut" }}>✨</motion.span>
        ))}
      </div>

      <motion.div className="streak-text" initial={{ opacity: 0, y: 14, scale: 0.7 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.95, type: "spring", stiffness: 260, damping: 14 }}>
        {label} ×{streak} · +{bonus}
      </motion.div>
    </div>
  );
}
