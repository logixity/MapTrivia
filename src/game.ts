import { COUNTRIES, Continent, Country } from "./data/countries";
import { MAPPED_CODES } from "./mapData";

export type ModeId = "flag-country" | "country-capital" | "capital-country" | "country-flag" | "draw-flag" | "map-country" | "country-map";

export interface Mode {
  id: ModeId;
  title: string;
  description: string;
  icon: string;
}

export const MODES: Mode[] = [
  { id: "flag-country", title: "Flag to Country", description: "Name the country from its flag", icon: "🏳️" },
  { id: "country-capital", title: "Country to Capital", description: "Pick the capital city", icon: "🏙️" },
  { id: "capital-country", title: "Capital to Country", description: "Which country has this capital?", icon: "📍" },
  { id: "country-flag", title: "Country to Flag", description: "Find the right flag", icon: "🚩" },
  { id: "draw-flag", title: "Draw the Flag", description: "Sketch it and see how close you get", icon: "✍️" },
  { id: "map-country", title: "Find on Map", description: "Locate the country from its capital", icon: "🗺️" },
  { id: "country-map", title: "Country on Map", description: "Find the named country on the map", icon: "🧭" },
];

export interface Option {
  label: string;
  flag?: string; // country code when the option is a flag
  countryCode?: string;
  correct: boolean;
}

export interface Question {
  type: "choices" | "draw-flag" | "map-country";
  prompt: string;
  promptFlag?: string;
  promptSub: string;
  options: Option[];
  answerLabel: string;
  targetCode: string;
}

export interface Settings {
  mode: ModeId;
  continent: Continent | "All";
  rounds: number;
  language: import("./i18n").Language;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function poolFor(continent: Settings["continent"]): Country[] {
  return continent === "All" ? COUNTRIES : COUNTRIES.filter((c) => c.continent === continent);
}

function buildQuestion(mode: ModeId, target: Country): Question {
  if (mode === "draw-flag") {
    return { type: "draw-flag", prompt: target.name, promptSub: "Draw this country's flag", options: [], answerLabel: target.name, targetCode: target.code };
  }
  if (mode === "map-country") {
    return { type: "map-country", prompt: target.capital, promptSub: "Find the country with this capital", options: [], answerLabel: target.name, targetCode: target.code };
  }
  if (mode === "country-map") {
    return { type: "map-country", prompt: target.name, promptSub: "Find this country on the map", options: [], answerLabel: target.name, targetCode: target.code };
  }
  // Distractors come from the same continent when possible, to keep them plausible.
  const sameContinent = COUNTRIES.filter((c) => c.continent === target.continent && c.code !== target.code);
  const source = sameContinent.length >= 3 ? sameContinent : COUNTRIES.filter((c) => c.code !== target.code);
  const distractors = shuffle(source).slice(0, 3);
  const all = shuffle([target, ...distractors]);

  const toOption = (c: Country): Option => {
    const correct = c.code === target.code;
    switch (mode) {
      case "flag-country":
      case "capital-country":
        return { label: c.name, countryCode: c.code, correct };
      case "country-capital":
        return { label: c.capital, countryCode: c.code, correct };
      case "country-flag":
        return { label: c.name, flag: c.code, countryCode: c.code, correct };
    }
  };

  const options = all.map(toOption);
  switch (mode) {
    case "flag-country":
      return { type: "choices", prompt: "", promptFlag: target.code, promptSub: "Which country does this flag belong to?", options, answerLabel: target.name, targetCode: target.code };
    case "country-capital":
      return { type: "choices", prompt: target.name, promptSub: "What is its capital?", options, answerLabel: target.capital, targetCode: target.code };
    case "capital-country":
      return { type: "choices", prompt: target.capital, promptSub: "Which country is this the capital of?", options, answerLabel: target.name, targetCode: target.code };
    case "country-flag":
      return { type: "choices", prompt: target.name, promptSub: "Which flag is theirs?", options, answerLabel: target.name, targetCode: target.code };
  }
}

export function buildQuiz(settings: Settings): Question[] {
  const all = poolFor(settings.continent);
  const pool = settings.mode === "map-country" || settings.mode === "country-map" ? all.filter((c) => MAPPED_CODES.has(c.code)) : all;
  return shuffle(pool)
    .slice(0, settings.rounds)
    .map((t) => buildQuestion(settings.mode, t));
}
