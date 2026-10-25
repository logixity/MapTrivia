// Vercel serverless function. Needs an Upstash Redis database (Vercel Marketplace) linked to the project.

interface Req { method?: string; query: Record<string, string | string[] | undefined>; body?: unknown }
interface Res { status(code: number): Res; json(body: unknown): void }

const MODES = ["flag-country", "country-capital", "capital-country", "country-flag", "draw-flag", "map-country", "country-map", "pin-country", "pin-capital", "pin-flag"];
const MAX_SCORE = 6000;
const URL = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

async function redis(command: (string | number)[]): Promise<unknown> {
  const response = await fetch(URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const data = (await response.json()) as { result?: unknown; error?: string };
  if (data.error) throw new Error(data.error);
  return data.result;
}

// HGETALL returns a flat [field, value, field, value, ...] array.
async function readMode(mode: string): Promise<Record<string, number>> {
  const flat = (await redis(["HGETALL", `lb:${mode}`])) as string[];
  const scores: Record<string, number> = {};
  for (let i = 0; i + 1 < flat.length; i += 2) scores[flat[i]] = Number(flat[i + 1]);
  return scores;
}

export default async function handler(req: Req, res: Res) {
  if (!URL || !TOKEN) return res.status(503).json({ error: "Leaderboard storage is not configured" });
  try {
    if (req.method === "POST") {
      const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as { name?: unknown; mode?: unknown; score?: unknown };
      const name = typeof body?.name === "string" ? body.name.trim().slice(0, 16) : "";
      const mode = String(body?.mode);
      const score = Number(body?.score);
      if (name.length < 2 || !MODES.includes(mode) || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
        return res.status(400).json({ error: "Invalid score" });
      }
      const current = Number(await redis(["HGET", `lb:${mode}`, name])) || 0;
      if (score > current) await redis(["HSET", `lb:${mode}`, name, score]);
      return res.status(200).json({ ok: true });
    }

    const mode = String(req.query.mode ?? "all");
    let totals: Record<string, number> = {};
    if (mode === "all") {
      // Overall = sum of each player's best score in every mode.
      for (const m of MODES) {
        const scores = await readMode(m);
        for (const [name, value] of Object.entries(scores)) totals[name] = (totals[name] ?? 0) + value;
      }
    } else if (MODES.includes(mode)) {
      totals = await readMode(mode);
    } else {
      return res.status(400).json({ error: "Unknown mode" });
    }
    const entries = Object.entries(totals).map(([name, score]) => ({ name, score })).sort((a, b) => b.score - a.score).slice(0, 50);
    return res.status(200).json({ entries });
  } catch {
    return res.status(500).json({ error: "Leaderboard error" });
  }
}
