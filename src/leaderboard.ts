import { ModeId } from "./game";

export interface Entry { name: string; score: number }
export type BoardKey = ModeId | "all";

const LOCAL_KEY = "maptrivia-local-scores";

type LocalScores = Record<string, Record<string, number>>;

function readLocal(): LocalScores {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}") as LocalScores;
  } catch {
    return {};
  }
}

function boardFromLocal(key: BoardKey): Entry[] {
  const all = readLocal();
  const totals: Record<string, number> = {};
  for (const [mode, scores] of Object.entries(all)) {
    if (key !== "all" && mode !== key) continue;
    for (const [name, score] of Object.entries(scores)) totals[name] = (totals[name] ?? 0) + score;
  }
  return Object.entries(totals).map(([name, score]) => ({ name, score })).sort((a, b) => b.score - a.score);
}

export async function submitScore(name: string, mode: ModeId, score: number): Promise<void> {
  const all = readLocal();
  all[mode] = all[mode] ?? {};
  all[mode][name] = Math.max(all[mode][name] ?? 0, score);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  try {
    await fetch("/api/scores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, mode, score }) });
  } catch {
    // Offline or no backend: the local copy above is enough.
  }
}

export async function fetchBoard(key: BoardKey): Promise<{ entries: Entry[]; online: boolean }> {
  try {
    const response = await fetch(`/api/scores?mode=${key}`);
    const data = (await response.json()) as { entries?: Entry[] };
    if (response.ok && Array.isArray(data.entries)) return { entries: data.entries, online: true };
  } catch {
    // Falls through to local scores (dev server or no backend).
  }
  return { entries: boardFromLocal(key), online: false };
}
