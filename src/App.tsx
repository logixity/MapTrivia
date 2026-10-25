import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Home from "./components/Home";
import Singleplayer from "./components/Singleplayer";
import SettingsScreen from "./components/SettingsScreen";
import Game from "./components/Game";
import Results from "./components/Results";
import { Settings } from "./game";
import { Language } from "./i18n";

type Screen =
  | { name: "home" }
  | { name: "singleplayer" }
  | { name: "settings" }
  | { name: "game"; settings: Settings }
  | { name: "results"; settings: Settings; score: number; best: number; correctCount: number };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("maptrivia-language") as Language) || "en");

  function changeLanguage(next: Language) {
    setLanguage(next);
    localStorage.setItem("maptrivia-language", next);
  }

  return (
    <div className="app">
      <div className="bg-orb orb1" />
      <div className="bg-orb orb2" />
      <div className="bg-orb orb3" />
      <AnimatePresence mode="wait">
        <motion.main
          key={screen.name}
          className="screen"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.3 }}
        >
          {screen.name === "home" && <Home language={language} onSingleplayer={() => setScreen({ name: "singleplayer" })} onSettings={() => setScreen({ name: "settings" })} />}
          {screen.name === "singleplayer" && <Singleplayer language={language} onBack={() => setScreen({ name: "home" })} onStart={(settings) => setScreen({ name: "game", settings })} />}
          {screen.name === "settings" && <SettingsScreen language={language} onLanguage={changeLanguage} onBack={() => setScreen({ name: "home" })} />}
          {screen.name === "game" && (
            <Game
              settings={screen.settings}
              onQuit={() => setScreen({ name: "home" })}
              onFinish={(score, best, correctCount) => setScreen({ name: "results", settings: screen.settings, score, best, correctCount })}
            />
          )}
          {screen.name === "results" && (
            <Results
              settings={screen.settings}
              score={screen.score}
              best={screen.best}
              correctCount={screen.correctCount}
              onAgain={() => setScreen({ name: "game", settings: screen.settings })}
              onMenu={() => setScreen({ name: "home" })}
            />
          )}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
