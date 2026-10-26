import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Home from "./components/Home";
import Singleplayer from "./components/Singleplayer";
import SettingsScreen from "./components/SettingsScreen";
import Game from "./components/Game";
import Results from "./components/Results";
import NameScreen from "./components/NameScreen";
import Leaderboard from "./components/Leaderboard";
import Multiplayer from "./components/Multiplayer";
import DuelQueue from "./components/DuelQueue";
import PlayerPicker from "./components/PlayerPicker";
import DuelIntro from "./components/DuelIntro";
import DuelResults from "./components/DuelResults";
import { PartyMenu, CreateParty, JoinParty, PartyLobby } from "./components/Party";
import InviteToasts from "./components/InviteToasts";
import { DuelMatch, DuelSettings, PartyInfo, Invite, duelApi, toSettings, usePresence } from "./duel";
import { Settings } from "./game";
import { Language, text } from "./i18n";

type Screen =
  | { name: "home" }
  | { name: "singleplayer" }
  | { name: "settings" }
  | { name: "leaderboard" }
  | { name: "name" }
  | { name: "multiplayer" }
  | { name: "partymenu" }
  | { name: "partycreate" }
  | { name: "partyjoin" }
  | { name: "partylobby"; party: PartyInfo }
  | { name: "duelsetup"; send: boolean }
  | { name: "duelqueue"; settings: DuelSettings }
  | { name: "duelpick"; settings: DuelSettings }
  | { name: "duelintro"; match: DuelMatch }
  | { name: "duelgame"; match: DuelMatch; settings: Settings }
  | { name: "duelresults"; match: DuelMatch; score: number; correct: number; lives: number; answered: number }
  | { name: "game"; settings: Settings }
  | { name: "results"; settings: Settings; score: number; best: number; correctCount: number };

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => (localStorage.getItem("maptrivia-username") ? { name: "home" } : { name: "name" }));
  const [username, setUsername] = useState(() => localStorage.getItem("maptrivia-username") ?? "");
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("maptrivia-language") as Language) || "en");

  const presence = usePresence(username);

  const startIntro = useCallback((match: DuelMatch) => setScreen({ name: "duelintro", match }), []);

  async function respond(invite: Invite, accept: boolean) {
    presence.dismiss(invite.id);
    try {
      const data = await duelApi<{ match?: DuelMatch }>("respond", { name: username, inviteId: invite.id, accept });
      if (accept && data.match) startIntro(data.match);
    } catch {
      // The invite expired or was cancelled before the answer arrived.
    }
  }

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
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
        >
          {screen.name === "name" && <NameScreen language={language} initial={username} onSave={(name) => { setUsername(name); localStorage.setItem("maptrivia-username", name); setScreen({ name: "home" }); }} />}
          {screen.name === "leaderboard" && <Leaderboard language={language} username={username} onBack={() => setScreen({ name: "home" })} />}
          {screen.name === "home" && <Home language={language} username={username} onLeaderboard={() => setScreen({ name: "leaderboard" })} onSingleplayer={() => setScreen({ name: "singleplayer" })} onMultiplayer={() => setScreen({ name: "multiplayer" })} onSettings={() => setScreen({ name: "settings" })} />}
          {screen.name === "singleplayer" && <Singleplayer showEligibility language={language} onBack={() => setScreen({ name: "home" })} onStart={(settings) => setScreen({ name: "game", settings })} />}
          {screen.name === "multiplayer" && <Multiplayer language={language} available={presence.available} onParties={() => setScreen({ name: "partymenu" })} onDuel={() => setScreen({ name: "duelsetup", send: false })} onSendDuel={() => setScreen({ name: "duelsetup", send: true })} onBack={() => setScreen({ name: "home" })} />}
          {screen.name === "partymenu" && <PartyMenu language={language} onCreate={() => setScreen({ name: "partycreate" })} onJoin={() => setScreen({ name: "partyjoin" })} onBack={() => setScreen({ name: "multiplayer" })} />}
          {screen.name === "partycreate" && <CreateParty language={language} name={username} onCreated={(party) => setScreen({ name: "partylobby", party })} onBack={() => setScreen({ name: "partymenu" })} />}
          {screen.name === "partyjoin" && <JoinParty language={language} name={username} onJoined={(party) => setScreen({ name: "partylobby", party })} onBack={() => setScreen({ name: "partymenu" })} />}
          {screen.name === "partylobby" && <PartyLobby language={language} party={screen.party} you={username} onStart={startIntro} onLeave={() => setScreen({ name: "partymenu" })} />}
          {screen.name === "duelsetup" && (
            <Singleplayer
              language={language}
              finishLabel={screen.send ? text(language, "chooseOpponent") : text(language, "duel")}
              onBack={() => setScreen({ name: "multiplayer" })}
              onStart={(s) => {
                const settings: DuelSettings = { mode: s.mode, continent: s.continent, timeLimit: s.timeLimit };
                setScreen(screen.send ? { name: "duelpick", settings } : { name: "duelqueue", settings });
              }}
            />
          )}
          {screen.name === "duelqueue" && <DuelQueue language={language} name={username} settings={screen.settings} onMatch={startIntro} onBack={() => setScreen({ name: "multiplayer" })} />}
          {screen.name === "duelpick" && <PlayerPicker language={language} name={username} settings={screen.settings} online={presence.online} onMatch={startIntro} onBack={() => setScreen({ name: "multiplayer" })} />}
          {screen.name === "duelintro" && <DuelIntro language={language} you={username} opponent={screen.match.kind === "party" ? screen.match.others.join(", ") : screen.match.opponent} startIn={screen.match.startIn} onStart={() => setScreen({ name: "duelgame", match: screen.match, settings: toSettings(screen.match.settings, screen.match.seed, language) })} />}
          {screen.name === "duelgame" && (
            <Game
              settings={screen.settings}
              duel={{ matchId: screen.match.id, opponents: screen.match.others }}
              onQuit={() => setScreen({ name: "home" })}
              onFinish={(score, _best, correct, lives, answered) => setScreen({ name: "duelresults", match: screen.match, score, correct, lives, answered })}
            />
          )}
          {screen.name === "duelresults" && <DuelResults language={language} you={username} match={screen.match} score={screen.score} correct={screen.correct} lives={screen.lives} answered={screen.answered} onMenu={() => setScreen({ name: "home" })} />}
          {screen.name === "settings" && <SettingsScreen language={language} username={username} onChangeName={() => setScreen({ name: "name" })} onLanguage={changeLanguage} onBack={() => setScreen({ name: "home" })} />}
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
              username={username}
              score={screen.score}
              best={screen.best}
              correctCount={screen.correctCount}
              onAgain={() => setScreen({ name: "game", settings: screen.settings })}
              onMenu={() => setScreen({ name: "home" })}
            />
          )}
        </motion.main>
      </AnimatePresence>
      <InviteToasts language={language} invites={screen.name === "duelgame" || screen.name === "duelintro" || screen.name === "partylobby" ? [] : presence.invites} onAccept={(invite) => respond(invite, true)} onDecline={(invite) => respond(invite, false)} />
    </div>
  );
}
