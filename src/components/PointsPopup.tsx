import { motion } from "framer-motion";

export interface Award {
  base: number;
  bonus: number;
  streak: number;
}

const FLAMES = [-46, -26, -8, 10, 28, 46];

export default function PointsPopup({ award, streakLabel }: { award: Award; streakLabel: string }) {
  return (
    <div className="points-pop" aria-live="polite">
      <motion.div className="points-base" initial={{ scale: 0.3, opacity: 0, y: 20 }} animate={{ scale: [0.3, 1.25, 1], opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        +{award.base}
      </motion.div>
      {award.bonus > 0 && (
        <motion.div className="points-fire" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9, type: "spring", stiffness: 220, damping: 12 }}>
          <div className="flames" aria-hidden>
            {FLAMES.map((left, i) => (
              <motion.span key={i} style={{ left: `calc(50% + ${left}px)` }} initial={{ y: 0, opacity: 0, scale: 0.6 }} animate={{ y: [-4, -34], opacity: [0, 1, 0], scale: [0.6, 1.2, 0.5] }} transition={{ delay: 0.9 + i * 0.07, duration: 0.9, repeat: Infinity, ease: "easeOut" }}>
                🔥
              </motion.span>
            ))}
          </div>
          <span className="fire-text">{streakLabel} ×{award.streak} +{award.bonus}</span>
        </motion.div>
      )}
    </div>
  );
}
