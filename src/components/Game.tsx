import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { COUNTRIES } from "../data/countries";
import { poolFor, Settings, buildQuiz } from "../game";
import { localizedCountry, text } from "../i18n";
import { localizedCapital } from "../data/capitals";
import FlagCanvas from "./FlagCanvas";
import HighlightMap from "./HighlightMap";
import PointsPopup, { Award } from "./PointsPopup";
import WorldMap from "./WorldMap";

const POINTS = 100;

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
  onQuit: () => void;
  onFinish: (score: number, bestStreak: number, correctCount: number) => void;
}

export default function Game({ settings, onQuit, onFinish }: Props) {
  const limit = settings.timeLimit ?? 0;
  const questions = useMemo(() => buildQuiz(settings), [settings]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
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
  const revealDelay = award && award.bonus > 0 ? 2800 : award ? 1800 : 1500;

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
    if (!revealed) return;
    const timer = setTimeout(() => {
      if (index + 1 >= questions.length) onFinish(score, best, correctCount);
      else {
        setIndex(index + 1);
        setPicked(null);
        setSelectedCode(null);
        setFlagAccuracy(null);
        setAward(null);
        setTimedOut(false);
        setDrawTimeUp(false);
      }
    }, revealDelay);
    return () => clearTimeout(timer);
  }, [revealed, index, questions.length, onFinish, score, best, correctCount, revealDelay]);

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
      : `${timedOut ? `${text(settings.language, "timeUp")} ` : ""}${text(settings.language, "answerWas")} ${answerText}`;

  return (
    <div className="game">
      <header className="hud">
        <button className="ghost" onClick={onQuit}>✕ {text(settings.language, "quit")}</button>
        <div className="progress"><motion.div className="progress-bar" animate={{ width: `${((index + (revealed ? 1 : 0)) / questions.length) * 100}%` }} /></div>
        <div className="stats">
          <span>{text(settings.language, "score")} <b>{score}</b></span>
          <span className="right-count">✓ {correctCount}</span>
          <span className={streak >= 3 ? "hot" : ""}>🔥 {streak}</span>
        </div>
      </header>

      {limit > 0 && (
        <div className={`timer ${timeLeft <= 5 ? "low" : ""}`} aria-label="Time left">
          <div className="timer-bar" style={{ width: `${(timeLeft / limit) * 100}%` }} />
          <span className="timer-num">{Math.ceil(timeLeft)}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.section key={index} className="question" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.25 }}>
          <p className="counter">{text(settings.language, "question")} {index + 1} / {questions.length}</p>
          {q.promptFlag
            ? <motion.span className={`fi fi-${q.promptFlag} big-flag`} initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} transition={{ type: "spring", stiffness: 120 }} />
            : q.promptMap
              ? <HighlightMap code={q.promptMap} />
              : <h2 className="prompt">{promptText}</h2>}
          <p className="prompt-sub">
            {q.type === "draw-flag" ? text(settings.language, "drawFlag") : q.type === "map-country" ? text(settings.language, settings.mode === "country-map" ? "findCountry" : "tapCountry") : text(settings.language, PROMPT_KEYS[settings.mode])}
          </p>

          {q.type === "draw-flag" && <FlagCanvas code={q.targetCode} onSubmit={submitDrawing} timeUp={drawTimeUp} clearLabel={text(settings.language, "clear")} submitLabel={text(settings.language, "submit")} />}
          {q.type === "map-country" && <WorldMap targetCode={q.targetCode} countries={poolFor(settings.continent)} language={settings.language} selectedCode={selectedCode} revealed={revealed} onPick={pickMap} />}
          {q.type === "choices" && <div className={`answers ${q.options[0]?.flag ? "flags" : ""}`}>
            {q.options.map((option, optionIndex) => {
              const state = !revealed ? "" : option.correct ? "correct" : optionIndex === picked ? "wrong" : "dim";
              const label = COUNTRY_OPTION_MODES.includes(settings.mode) && option.countryCode
                ? localizedCountry(option.countryCode, option.label, settings.language)
                : CAPITAL_OPTION_MODES.includes(settings.mode) ? localizedCapital(option.label, settings.language) : option.label;
              return (
                <motion.button key={optionIndex} className={`answer ${state}`} onClick={() => choose(optionIndex)} disabled={revealed} initial={{ opacity: 0, y: 20 }} animate={state === "wrong" ? { opacity: 1, y: 0, x: [0, -8, 8, -8, 8, 0] } : { opacity: 1, y: 0 }} transition={{ delay: revealed ? 0 : optionIndex * 0.06 }} whileHover={revealed ? undefined : { scale: 1.03 }} whileTap={revealed ? undefined : { scale: 0.97 }}>
                  {option.flag ? <span className={`fi fi-${option.flag} option-flag`} aria-label={label} /> : label}
                </motion.button>
              );
            })}
          </div>}

          <div className="feedback"><AnimatePresence>{revealed && <motion.p className={isCorrect ? "ok" : "bad"} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>{feedback}</motion.p>}</AnimatePresence></div>
          {revealed && award && <PointsPopup award={award} streakLabel={text(settings.language, "streak")} />}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
