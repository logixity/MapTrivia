import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Language, text } from "../i18n";

interface Props {
  language: Language;
  you: string;
  opponent: string;
  startIn: number;
  onStart: () => void;
}

export default function DuelIntro({ language, you, opponent, startIn, onStart }: Props) {
  const [left, setLeft] = useState(Math.ceil(startIn / 1000));
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;

  useEffect(() => {
    const end = Date.now() + startIn;
    const timer = setInterval(() => {
      const remaining = Math.ceil((end - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(timer);
        onStartRef.current();
      } else setLeft(remaining);
    }, 100);
    return () => clearInterval(timer);
  }, [startIn]);

  return (
    <div className="menu duel-intro">
      <motion.h2 className="step-title" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 10 }}>
        {text(language, "matchFound")}
      </motion.h2>
      <div className="versus">
        <motion.div className="fighter" initial={{ x: -140, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 140, damping: 14 }}>{you}</motion.div>
        <motion.span className="vs" initial={{ scale: 0 }} animate={{ scale: [0, 1.6, 1], rotate: [0, 10, 0] }} transition={{ delay: 0.3, duration: 0.5 }}>⚔️</motion.span>
        <motion.div className="fighter" initial={{ x: 140, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 140, damping: 14 }}>{opponent}</motion.div>
      </div>
      <div className="countdown">
        <AnimatePresence mode="wait">
          <motion.span key={left} initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.3 }}>{left}</motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
