import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Menu from "./components/Menu";
import Game from "./components/Game";
import Results from "./components/Results";
import { Settings } from "./game";

type Screen = { name: "menu" } | { name: "game"; settings: Settings } | { name: "results"; settings: Settings; score: number; best: number; correctCount: number };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "menu" });

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
          {screen.name === "menu" && <Menu onStart={(settings) => setScreen({ name: "game", settings })} />}
          {screen.name === "game" && (
            <Game
              settings={screen.settings}
              onQuit={() => setScreen({ name: "menu" })}
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
              onMenu={() => setScreen({ name: "menu" })}
            />
          )}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
