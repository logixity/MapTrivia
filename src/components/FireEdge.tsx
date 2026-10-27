import { AnimatePresence, motion } from "framer-motion";

const TONGUES = 9;

// Fire along the bottom of the screen that grows with the streak.
export default function FireEdge({ level }: { level: number }) {
  return (
    <AnimatePresence>
      {level > 0 && (
        <motion.div key="fire" className={`fire-edge lvl-${level}`} style={{ ["--lvl" as string]: level }} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} transition={{ duration: 0.5 }} aria-hidden>
          {Array.from({ length: TONGUES }, (_, i) => <span key={i} style={{ animationDelay: `${(i % 4) * -0.23}s`, animationDuration: `${0.6 + (i % 3) * 0.15}s`, height: `${70 + ((i * 37) % 30)}%` }} />)}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
