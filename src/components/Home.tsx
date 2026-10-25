import { motion } from "framer-motion";
import { Language, text } from "../i18n";

interface Props {
  language: Language;
  onSingleplayer: () => void;
  onSettings: () => void;
}

export default function Home({ language, onSingleplayer, onSettings }: Props) {
  return (
    <div className="menu home">
      <motion.h1 className="title" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}>
        <motion.span className="globe" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 18, ease: "linear" }}>🌍</motion.span>
        Map Trivia
      </motion.h1>
      <p className="subtitle">{text(language, "tagline")}</p>
      <nav className="home-buttons">
        <motion.button className="home-btn primary" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onSingleplayer}>
          {text(language, "singleplayer")}
        </motion.button>
        <motion.button className="home-btn" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onSettings}>
          {text(language, "settings")}
        </motion.button>
      </nav>
    </div>
  );
}
