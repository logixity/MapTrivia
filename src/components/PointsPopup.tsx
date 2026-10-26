import { motion } from "framer-motion";
import StreakFlame from "./StreakFlame";

export interface Award {
  base: number;
  bonus: number;
  streak: number;
}

export default function PointsPopup({ award, streakLabel }: { award: Award; streakLabel: string }) {
  return (
    <div className="points-pop" aria-live="polite">
      <motion.div className="points-base" initial={{ scale: 0.3, opacity: 0, y: 20 }} animate={{ scale: [0.3, 1.25, 1], opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        +{award.base}
      </motion.div>
      {award.bonus > 0 && <StreakFlame streak={award.streak} bonus={award.bonus} label={streakLabel} />}
    </div>
  );
}
