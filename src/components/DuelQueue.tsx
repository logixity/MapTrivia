import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Language, text } from "../i18n";
import { DuelMatch, DuelSettings, duelApi } from "../duel";

interface Props {
  language: Language;
  name: string;
  settings: DuelSettings;
  onMatch: (match: DuelMatch) => void;
  onBack: () => void;
}

export default function DuelQueue({ language, name, settings, onMatch, onBack }: Props) {
  const [error, setError] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const matched = useRef(false);
  const onMatchRef = useRef(onMatch);
  onMatchRef.current = onMatch;

  useEffect(() => {
    let stopped = false;
    async function poll() {
      try {
        const data = await duelApi<{ status: string; match?: DuelMatch }>("queue", { name, settings });
        if (stopped) return;
        setError(false);
        if (data.status === "matched" && data.match) {
          matched.current = true;
          onMatchRef.current(data.match);
        }
      } catch {
        if (!stopped) setError(true);
      }
    }
    poll();
    const timer = setInterval(poll, 2000);
    const clock = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      stopped = true;
      clearInterval(timer);
      clearInterval(clock);
      if (!matched.current) duelApi("leave", { settings }).catch(() => {});
    };
  }, [name, settings]);

  return (
    <div className="menu queue">
      <div className="radar" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="radar-ring" initial={{ scale: 0.2, opacity: 0.8 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ repeat: Infinity, duration: 2.4, delay: i * 0.8, ease: "easeOut" }} />
        ))}
        <motion.span className="radar-core" animate={{ rotate: [0, -12, 12, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>⚔️</motion.span>
      </div>
      <h2 className="step-title">{error ? text(language, "unavailable") : text(language, "searching")}</h2>
      <p className="subtitle">{text(language, "searchingSub")} · {seconds}s</p>
      <div className="wizard-nav">
        <button className="ghost" onClick={onBack}>✕ {text(language, "cancel")}</button>
      </div>
    </div>
  );
}
