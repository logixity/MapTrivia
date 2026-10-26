import { motion } from "framer-motion";

export default function Lives({ lives, max = 3, small = false }: { lives: number; max?: number; small?: boolean }) {
  return (
    <div className={`lives ${small ? "small" : ""}`} aria-label={`${lives} / ${max}`}>
      {Array.from({ length: max }, (_, i) =>
        i < lives ? (
          <motion.span key={`alive-${i}`} className="heart" animate={{ scale: [1, 1.18, 1] }} transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.2 }}>
            ❤️
          </motion.span>
        ) : (
          <motion.span key={`lost-${i}`} className="heart lost" initial={{ scale: 2, rotate: -25, opacity: 1 }} animate={{ scale: 1, rotate: [-25, 15, -8, 0], opacity: 0.4 }} transition={{ type: "spring", stiffness: 160, damping: 9 }}>
            💔
          </motion.span>
        ),
      )}
    </div>
  );
}
