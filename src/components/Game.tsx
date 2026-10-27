import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { COUNTRIES } from "../data/countries";
import { poolFor, Settings, buildQuiz } from "../game";
import { localizedCountry, text } from "../i18n";
import { localizedCapital } from "../data/capitals";
import FlagCanvas from "./FlagCanvas";
import HighlightMap from "./HighlightMap";
import PointsPopup, { Award } from "./PointsPopup";
import FireEdge from "./FireEdge";
import { streakLevel } from "./StreakFlame";
import WorldMap from "./WorldMap";
import Lives from "./Lives";
import AnimatedNumber from "./AnimatedNumber";
import Burst from "./Burst";
import { FORFEIT_AFTER_MS, duelApi, Progress } from "../duel";

const POINTS = 100;
const MAX_LIVES = 3;

const COUNTRY_PROMPT_MODES = ["country-capital", "country-map", "country-flag", "draw-flag"];
const COUNTRY_OPTION_MODES = ["flag-country", "capital-country", "country-flag", "pin-country", "pin-flag"];
const CAPITAL_OPTION_MODES = ["country-capital", "pin-capital"];
const PROMPT_KEYS: Record<string, string> = {
  "flag-country": "promptFlag",
  "country-capital": "promptCapital",
  "capital-country": "promptCapitalCountry",
  "country-flag": "promptCountryFlag",
  "pin-country": "promptPinCountry",
  "pin-capital": "promptPinCapital",
  "pin-flag": "promptPinFlag",
};

interface Props {
  settings: Settings;
  duel?: { matchId: string; opponents: string[] };
  onQuit: () => void;
  onFinish: (score: number, bestStreak: number, correctCount: number, lives: number, answered: number) => void;
}

export default function Game({ settings, duel, onQuit, onFinish }: Props) {
  const limit = settings.timeLimit ?? 0;
  const questions = useMemo(() => buildQuiz(settings), [settings]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [flash, setFlash] = useState(0);
  const [others, setOthers] = useState<Progress[]>([]);
  const [revealDone, setRevealDone] = useState(false);
  const finishedRef = useRef(false);
  const progressRef = useRef({ correct: 0, score: 0, lives: MAX_LIVES, answered: 0, died: false });
  const [picked, setPicked] = useState<number | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [flagAccuracy, setFlagAccuracy] = useState<number | null>(null);
  const [award, setAward] = useState<Award | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [drawTimeUp, setDrawTimeUp] = useState(false);
  const [timeLeft, setTimeLeft] = useState(limit);
  const timeLeftRef = useRef(limit);
  const timeoutRef = useRef<() => void>(() => {});

  const q = questions[index];
  const revealed = picked !== null;
  const isCorrect = q.type === "map-country"
    ? selectedCode === q.targetCode
    : q.type === "draw-flag"
      ? (flagAccuracy ?? 0) >= 45
      : revealed && picked >= 0 && q.options[picked].correct;
  const target = COUNTRIES.find((country) => country.code === q.targetCode)!;
  const countryLabel = localizedCountry(target.code, target.name, settings.language);
  const capitalLabel = localizedCapital(target.capital, settings.language);
  const promptText = COUNTRY_PROMPT_MODES.includes(settings.mode) ? countryLabel : capitalLabel;
  const answerText = CAPITAL_OPTION_MODES.includes(settings.mode) ? capitalLabel : countryLabel;
  const outOfLives = revealed && lives <= 0;
  const level = streakLevel(streak);
  // Mistakes (and drawings, which show the real flag) stay up longer so there is time to learn from them.
  const learning = revealed && (!isCorrect || q.type === "draw-flag");
  const revealDelay = q.type === "draw-flag" ? 5000 : outOfLives ? 4500 : learning ? 3800 : award && award.bonus > 0 ? 3400 : award ? 1800 : 1500;
  const answered = index + (revealed ? 1 : 0);
  progressRef.current = { correct: correctCount, score, lives, answered, died: lives <= 0 };

  const syncNow = useCallback(async (finished: boolean) => {
    if (!duel) return;
    try {
      const data = await duelApi<{ others: Progress[] }>("sync", { matchId: duel.matchId, progress: { ...progressRef.current, finished } });
      setOthers(data.others);
    } catch {
      // Missed syncs are retried on the next tick.
    }
  }, [duel]);

  useEffect(() => {
    if (!duel) return;
    const timer = setInterval(() => syncNow(false), 1000);
    return () => clearInterval(timer);
  }, [duel, syncNow]);

  // Report every answer (and the final life) right away so opponents never wait on the next heartbeat.
  useEffect(() => {
    syncNow(lives <= 0);
  }, [syncNow, answered, lives]);

  const gone = (p: Progress) => p.finished || (p.age ?? 0) > FORFEIT_AFTER_MS;
  const aliveOthers = others.filter((p) => !gone(p));
  const synced = !!duel && others.length === duel.opponents.length;
  const ready = !duel || aliveOthers.every((p) => p.answered >= index + 1);
  const waiting = !!duel && revealed && revealDone && lives > 0 && !ready;

  // Last one standing: once nobody else is left in the match, this player is sent to the results.
  useEffect(() => {
    if (synced && aliveOthers.length === 0 && !finishedRef.current) {
      finishedRef.current = true;
      onFinish(score, best, correctCount, lives, answered);
    }
  }, [synced, aliveOthers.length, onFinish, score, best, correctCount, lives, answered]);

  timeoutRef.current = () => {
    if (revealed) return;
    setTimedOut(true);
    if (q.type === "draw-flag") setDrawTimeUp(true);
    else resolve(false, undefined, -1);
  };

  useEffect(() => {
    if (revealed || !limit) return;
    const end = Date.now() + limit * 1000;
    timeLeftRef.current = limit;
    setTimeLeft(limit);
    const id = setInterval(() => {
      const left = Math.max(0, (end - Date.now()) / 1000);
      timeLeftRef.current = left;
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(id);
        timeoutRef.current();
      }
    }, 100);
    return () => clearInterval(id);
  }, [index, revealed, limit]);

  useEffect(() => {
    if (!revealed) {
      setRevealDone(false);
      return;
    }
    const timer = setTimeout(() => setRevealDone(true), revealDelay);
    return () => clearTimeout(timer);
  }, [revealed, revealDelay]);

  useEffect(() => {
    if (!revealed || !revealDone || finishedRef.current) return;
    if (lives <= 0 || index + 1 >= questions.length) {
      finishedRef.current = true;
      onFinish(score, best, correctCount, lives, answered);
      return;
    }
    if (!ready) return;
    setRevealDone(false);
    setIndex(index + 1);
    setPicked(null);
    setSelectedCode(null);
    setFlagAccuracy(null);
    setAward(null);
    setTimedOut(false);
    setDrawTimeUp(false);
  }, [revealed, revealDone, ready, index, questions.length, onFinish, score, best, correctCount, lives, answered]);
  function resolve(correct: boolean, accuracy?: number, answerIndex = 0) {
    if (revealed) return;
    setPicked(answerIndex);
    if (accuracy !== undefined) setFlagAccuracy(accuracy);
    // Less time left means fewer points, down to 40% of the full value.
    const factor = limit ? 0.4 + 0.6 * (timeLeftRef.current / limit) : 1;
    if (correct) {
      const nextStreak = streak + 1;
      const base = Math.round((accuracy === undefined ? POINTS : accuracy * 2) * factor);
      const bonus = Math.min(nextStreak - 1, 5) * 20;
      setStreak(nextStreak);
      setBest(Math.max(best, nextStreak));
      setCorrectCount(correctCount + 1);
      setScore(score + base + bonus);
      setAward({ base, bonus, streak: nextStreak });
    } else {
      setStreak(0);
      setLives(lives - 1);
      setFlash((n) => n + 1);
      if (accuracy !== undefined && accuracy > 0) {
        setScore(score + accuracy);
        setAward({ base: accuracy, bonus: 0, streak: 0 });
      }
    }
  }

  function choose(optionIndex: number) {
    if (revealed) return;
    resolve(q.options[optionIndex].correct, undefined, optionIndex);
  }

  function pickMap(code: string) {
    if (revealed) return;
    setSelectedCode(code);
    resolve(code === q.targetCode);
  }

  function submitDrawing(accuracy: number) {
    resolve(accuracy >= 45, accuracy);
  }

  const feedback = q.type === "draw-flag" && flagAccuracy !== null
    ? `${text(settings.language, "accuracy")}: ${flagAccuracy}%`
    : isCorrect
      ? text(settings.language, "correct")
      : `${timedOut ? `${text(settings.language, "timeUp")} ` : ""}${text(settings.language, "answerWas")} ${answerText}${outOfLives ? ` · ${text(settings.language, "lostAllLives")}` : ""}`;

  return (
    <motion.div className={`game ${level ? `fire-${level}` : ""}`} animate={revealed && isCorrect && level >= 2 ? { x: [0, -7, 7, -5, 5, 0] } : { x: 0 }} transition={{ duration: 0.4 }}>
      <FireEdge level={level} />
      <header className="hud">
        <button className="ghost" onClick={onQuit}>✕ {text(settings.language, "quit")}</button>
        <Lives lives={lives} max={MAX_LIVES} />
        <div className="stats">
          <span>{text(settings.language, "score")} <b><AnimatedNumber value={score} /></b></span>
          <span className="right-count">✓ {correctCount}</span>
          <motion.span key={streak} className={`${streak >= 3 ? "hot" : ""} hot-lvl-${level}`} initial={{ scale: streak ? 1.6 : 1 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 10 }}>🔥 {streak}</motion.span>
        </div>
      </header>

      {duel && (
        <div className="opponent-hud">
          {duel.opponents.map((name) => {
            const p = others.find((o) => o.name === name);
            return (
              <span key={name} className={`opp-chip ${p && gone(p) ? "out" : ""}`}>
                <span className="opp-name">{p && gone(p) ? "💀" : "⚔️"} {name}</span>
                <Lives lives={p?.lives ?? MAX_LIVES} max={MAX_LIVES} small />
                <span>✓ {p?.correct ?? 0}</span>
              </span>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {flash > 0 && <motion.div key={flash} className="flash" initial={{ opacity: 0.45 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} />}
      </AnimatePresence>

      {limit > 0 && (
        <div className={`timer ${timeLeft <= 5 ? "low" : ""}`} aria-label="Time left">
          <div className="timer-bar" style={{ width: `${(timeLeft / limit) * 100}%` }} />
          <span className="timer-num">{Math.ceil(timeLeft)}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.section key={index} className="question" initial={{ opacity: 0, x: 80, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -80, scale: 0.96 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}>
          <p className="counter">{text(settings.language, "question")} {index + 1}</p>
          {q.promptFlag
            ? <motion.span className={`fi fi-${q.promptFlag} big-flag`} initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} transition={{ type: "spring", stiffness: 120 }} />
            : q.promptMap
              ? <HighlightMap code={q.promptMap} />
              : <h2 className="prompt">{promptText}</h2>}
          <p className="prompt-sub">
            {q.type === "draw-flag" ? text(settings.language, "drawFlag") : q.type === "map-country" ? text(settings.language, settings.mode === "country-map" ? "findCountry" : "tapCountry") : text(settings.language, PROMPT_KEYS[settings.mode])}
          </p>

          {q.type === "draw-flag" && <FlagCanvas code={q.targetCode} onSubmit={submitDrawing} timeUp={drawTimeUp} clearLabel={text(settings.language, "clear")} submitLabel={text(settings.language, "submit")} revealLabel={text(settings.language, "realFlag")} />}
          {q.type === "map-country" && <WorldMap targetCode={q.targetCode} countries={poolFor(settings.continent)} language={settings.language} selectedCode={selectedCode} revealed={revealed} onPick={pickMap} />}
          {q.type === "choices" && <div className={`answers ${q.options[0]?.flag ? "flags" : ""}`}>
            {q.options.map((option, optionIndex) => {
              const state = !revealed ? "" : option.correct ? "correct" : optionIndex === picked ? "wrong" : "dim";
              const label = COUNTRY_OPTION_MODES.includes(settings.mode) && option.countryCode
                ? localizedCountry(option.countryCode, option.label, settings.language)
                : CAPITAL_OPTION_MODES.includes(settings.mode) ? localizedCapital(option.label, settings.language) : option.label;
              return (
                <motion.button key={optionIndex} className={`answer ${state}`} onClick={() => choose(optionIndex)} disabled={revealed} initial={{ opacity: 0, y: 20 }} animate={state === "wrong" ? { opacity: 1, y: 0, x: [0, -10, 10, -8, 8, 0] } : state === "correct" ? { opacity: 1, y: 0, scale: [1, 1.1, 1] } : { opacity: 1, y: 0 }} transition={revealed ? { duration: 0.5 } : { type: "spring", stiffness: 300, damping: 20, delay: optionIndex * 0.07 }} whileHover={revealed ? undefined : { scale: 1.03 }} whileTap={revealed ? undefined : { scale: 0.97 }}>
                  {option.flag ? <span className={`fi fi-${option.flag} option-flag`} aria-label={label} /> : label}
                </motion.button>
              );
            })}
          </div>}

          {waiting && <p className="waiting-note">⏳ {text(settings.language, "waitingForOthers")}</p>}
          <div className="feedback"><AnimatePresence>{revealed && <motion.p className={isCorrect ? "ok" : "bad"} initial={{ opacity: 0, scale: 0.6, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}>{feedback}</motion.p>}</AnimatePresence></div>
          {revealed && isCorrect && <Burst />}
          {revealed && award && <PointsPopup award={award} streakLabel={text(settings.language, "streak")} streakTitle={text(settings.language, `streakTitle${Math.max(1, level)}`)} />}
          {learning && !revealDone && <button className="ghost skip-btn" onClick={() => setRevealDone(true)}>{text(settings.language, "continue")} →</button>}
        </motion.section>
      </AnimatePresence>
    </motion.div>
  );
}
