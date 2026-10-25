import { useState } from "react";
import { motion } from "framer-motion";
import { CONTINENTS } from "../data/countries";
import { MODES, ModeId, Settings, poolFor } from "../game";
import { Language, continentName, text } from "../i18n";

const ROUND_OPTIONS = [5, 10, 20];
const TIME_OPTIONS = [10, 15, 30, 60, 0];

type Guess = "country" | "capital" | "flag" | "map";

const GUESSES: { id: Guess; icon: string; label: string }[] = [
  { id: "country", icon: "🌍", label: "gCountry" },
  { id: "capital", icon: "🏙️", label: "gCapital" },
  { id: "flag", icon: "🚩", label: "gFlag" },
  { id: "map", icon: "🗺️", label: "gMap" },
];

const SOURCES: Record<Guess, { mode: ModeId; icon: string; label: string }[]> = {
  country: [
    { mode: "flag-country", icon: "🏳️", label: "fromFlag" },
    { mode: "capital-country", icon: "📍", label: "fromCapital" },
    { mode: "pin-country", icon: "📌", label: "fromMap" },
  ],
  capital: [
    { mode: "country-capital", icon: "🌍", label: "fromCountry" },
    { mode: "pin-capital", icon: "📌", label: "fromMap" },
  ],
  flag: [
    { mode: "country-flag", icon: "🌍", label: "fromCountry" },
    { mode: "draw-flag", icon: "✍️", label: "fromCountryDraw" },
    { mode: "pin-flag", icon: "📌", label: "fromMap" },
  ],
  map: [
    { mode: "country-map", icon: "🌍", label: "fromCountry" },
    { mode: "map-country", icon: "📍", label: "fromCapital" },
  ],
};

const DESCRIPTIONS: Record<ModeId, string> = {
  "flag-country": "descFlag",
  "country-capital": "descCapital",
  "capital-country": "descCapitalCountry",
  "country-flag": "descCountryFlag",
  "draw-flag": "descDraw",
  "map-country": "descMap",
  "country-map": "descCountryMap",
  "pin-country": "descPinCountry",
  "pin-capital": "descPinCapital",
  "pin-flag": "descPinFlag",
};

interface Props {
  language: Language;
  onStart: (settings: Settings) => void;
  onBack: () => void;
}

export default function Singleplayer({ language, onStart, onBack }: Props) {
  const [step, setStep] = useState(0);
  const [guess, setGuess] = useState<Guess | null>(null);
  const [mode, setMode] = useState<ModeId | null>(null);
  const [continent, setContinent] = useState<Settings["continent"]>("All");
  const [rounds, setRounds] = useState(10);
  const [timeLimit, setTimeLimit] = useState(15);

  const available = poolFor(continent).length;
  const titles = ["stepGuess", "stepFrom", "stepOptions"];
  const canNext = step === 0 ? guess !== null : step === 1 ? mode !== null : true;

  function chooseGuess(next: Guess) {
    setGuess(next);
    const options = SOURCES[next];
    // Pre-select when there is only one way to play it.
    setMode(options.length === 1 ? options[0].mode : null);
  }

  function back() {
    if (step === 0) onBack();
    else setStep(step - 1);
  }

  function next() {
    if (step < 2) setStep(step + 1);
    else if (mode) onStart({ mode, continent, rounds: Math.min(rounds, available), timeLimit, language });
  }

  return (
    <div className="menu">
      <div className="steps" aria-hidden>
        {titles.map((_, i) => <span key={i} className={`step-dot ${i <= step ? "on" : ""}`} />)}
      </div>
      <h2 className="step-title">{text(language, titles[step])}</h2>

      {step === 0 && (
        <div className="mode-grid">
          {GUESSES.map((item, i) => (
            <motion.button key={item.id} className={`mode-card ${guess === item.id ? "selected" : ""}`} onClick={() => chooseGuess(item.id)} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ scale: 1.04, y: -4 }} whileTap={{ scale: 0.97 }}>
              <span className="mode-icon">{item.icon}</span>
              <strong>{text(language, item.label)}</strong>
            </motion.button>
          ))}
        </div>
      )}

      {step === 1 && guess && (
        <div className="mode-grid">
          {SOURCES[guess].map((item, i) => (
            <motion.button key={item.mode} className={`mode-card ${mode === item.mode ? "selected" : ""}`} onClick={() => setMode(item.mode)} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ scale: 1.04, y: -4 }} whileTap={{ scale: 0.97 }}>
              <span className="mode-icon">{item.icon}</span>
              <strong>{text(language, item.label)}</strong>
              <small>{text(language, DESCRIPTIONS[item.mode])}</small>
            </motion.button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="options">
          <p className="option-label">{text(language, "continent")}</p>
          <div className="chip-row">
            {(["All", ...CONTINENTS] as Settings["continent"][]).map((c) => (
              <button key={c} className={`chip ${continent === c ? "active" : ""}`} onClick={() => setContinent(c)}>{continentName(c, language)}</button>
            ))}
          </div>
          <p className="option-label">{text(language, "rounds")}</p>
          <div className="chip-row">
            {ROUND_OPTIONS.map((r) => (
              <button key={r} className={`chip ${rounds === r ? "active" : ""}`} onClick={() => setRounds(r)}>{r}</button>
            ))}
          </div>
          <p className="option-label">{text(language, "timeLimit")}</p>
          <div className="chip-row">
            {TIME_OPTIONS.map((t) => (
              <button key={t} className={`chip ${timeLimit === t ? "active" : ""}`} onClick={() => setTimeLimit(t)}>{t === 0 ? "∞" : `${t}s`}</button>
            ))}
          </div>
        </div>
      )}

      <div className="wizard-nav">
        <button className="ghost" onClick={back}>← {text(language, "back")}</button>
        {step < 2 ? (
          <button className="play" disabled={!canNext} onClick={next}>{text(language, "next")} →</button>
        ) : (
          <button className="play" onClick={next}>{text(language, "play")}</button>
        )}
      </div>
    </div>
  );
}
