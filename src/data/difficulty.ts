import type { Country } from "./countries";

export type Difficulty = "easy" | "medium" | "hard" | "insane" | "impossible" | "all";

export const DIFFICULTIES: Difficulty[] = ["all", "easy", "medium", "hard", "insane", "impossible"];

// Tier 1 = most familiar countries, tier 5 = the ones most players have never heard of.
const TIERS: Record<number, string> = {
  1: "fr de it es gb nl se no ch pt gr us ca mx br ar au nz cn jp in kr th tr eg za ru",
  2: "at be hr cz dk fi hu is ie pl ua id ir iq il pk ph sg sa ae vn ke ma ng jm cu cl co pe by cy mt kp af bs",
  3: "al bg ro rs ee lv lt sk si bd lk my kz lb jo am ge dz et gh ly mg sn sd tz tn cr do pa bo ec uy ve fj mc va md me mk az kh sy ye om mm la uz cd ci bw ml so",
  4: "ba lu mn np kw qa ao cm ug zm zw mz na py pg ad li sm bh bt mv kg tj tm bn bj bf bi cf td cg gq er sz ga gm gn gw ls lr mw mr mu ne sc sl ss tg bb bz tt gy sr sb vu",
  5: "ws to sv gt ht hn ni rw tl cv km dj st ag dm gd kn lc vc ki mh fm nr pw tv",
};

const TIER_OF = new Map<string, number>();
for (const [tier, codes] of Object.entries(TIERS)) for (const code of codes.split(" ")) TIER_OF.set(code, Number(tier));

const WANTED: Record<Exclude<Difficulty, "all">, number> = { easy: 1, medium: 2, hard: 3, insane: 4, impossible: 5 };

export function tierOf(code: string): number {
  return TIER_OF.get(code) ?? 3;
}

// Countries of the chosen tier come first, then the neighbouring tiers, so a quiz never runs dry.
export function orderByDifficulty(pool: Country[], difficulty: Difficulty, shuffle: <T>(items: T[]) => T[]): Country[] {
  if (difficulty === "all") return shuffle(pool);
  const wanted = WANTED[difficulty];
  const groups = new Map<number, Country[]>();
  for (const country of pool) {
    const distance = Math.abs(tierOf(country.code) - wanted);
    groups.set(distance, [...(groups.get(distance) ?? []), country]);
  }
  return [...groups.keys()].sort((a, b) => a - b).flatMap((distance) => shuffle(groups.get(distance)!));
}
