import { useState } from "react";
import { motion } from "framer-motion";
import { CONTINENTS } from "../data/countries";
import { MODES, ModeId, Settings, poolFor } from "../game";
import { LANGUAGES, Language, continentName, text } from "../i18n";

const ROUND_OPTIONS = [5, 10, 20];
const descriptionKeys: Record<ModeId, string> = {
  "flag-country": "descFlag",
  "country-capital": "descCapital",
  "capital-country": "descCapitalCountry",
  "country-flag": "descCountryFlag",
  "draw-flag": "descDraw",
  "map-country": "descMap",
  "country-map": "descCountryMap",
};

export default function Menu({ onStart }: { onStart: (s: Settings) => void }) {
  const [mode, setMode] = useState<ModeId>("flag-country");
  const [continent, setContinent] = useState<Settings["continent"]>("All");
  const [rounds, setRounds] = useState(10);
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("maptrivia-language") as Language) || "en");

  const available = poolFor(continent).length;
  const effectiveRounds = Math.min(rounds, available);

  return (
    <div className="menu">
      <details className="settings-menu">
        <summary aria-label={text(language, "settings")}>⚙</summary>
        <label>{text(language, "language")}
          <select value={language} onChange={(event) => {
            const next = event.target.value as Language;
            setLanguage(next);
            localStorage.setItem("maptrivia-language", next);
          }}>
            {LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
        </label>
      </details>
      <motion.h1
        className="title"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 12 }}
      >
        <motion.span className="globe" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 18, ease: "linear" }}>
          🌍
        </motion.span>
        Map Trivia
      </motion.h1>
      <p className="subtitle">{text(language, "tagline")}</p>

      <div className="mode-grid">
        {MODES.map((m, i) => (
          <motion.button
            key={m.id}
            className={`mode-card ${mode === m.id ? "selected" : ""}`}
            onClick={() => setMode(m.id)}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            whileHover={{ scale: 1.04, y: -4 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="mode-icon">{m.icon}</span>
            <strong>{text(language, `mode${m.id === "flag-country" ? "Flag" : m.id === "country-capital" ? "Capital" : m.id === "capital-country" ? "CapitalCountry" : m.id === "country-flag" ? "CountryFlag" : m.id === "draw-flag" ? "Draw" : m.id === "country-map" ? "CountryMap" : "Map"}`)}</strong>
            <small>{text(language, descriptionKeys[m.id])}</small>
          </motion.button>
        ))}
      </div>

      <div className="options">
        <div className="chip-row">
          {(["All", ...CONTINENTS] as Settings["continent"][]).map((c) => (
            <button key={c} className={`chip ${continent === c ? "active" : ""}`} onClick={() => setContinent(c)}>
              {continentName(c, language)}
            </button>
          ))}
        </div>
        <div className="chip-row">
          {ROUND_OPTIONS.map((r) => (
            <button key={r} className={`chip ${rounds === r ? "active" : ""}`} onClick={() => setRounds(r)}>
              {r} {text(language, "questions")}
            </button>
          ))}
        </div>
      </div>

      <motion.button
        className="play"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        animate={{ boxShadow: ["0 0 0 0 rgba(255,200,87,0.6)", "0 0 0 18px rgba(255,200,87,0)"] }}
        transition={{ boxShadow: { repeat: Infinity, duration: 1.6 } }}
        onClick={() => onStart({ mode, continent, rounds: effectiveRounds, language })}
      >
        {text(language, "play")}
      </motion.button>
    </div>
  );
}
