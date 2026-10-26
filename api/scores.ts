// Vercel serverless function. Needs a Redis database linked to the project (REDIS_URL).
import { createClient } from "redis";

interface Req { method?: string; query: Record<string, string | string[] | undefined>; body?: unknown }
interface Res { status(code: number): Res; json(body: unknown): void }

const MODES = ["flag-country", "country-capital", "capital-country", "country-flag", "draw-flag", "map-country", "country-map", "pin-country", "pin-capital", "pin-flag"];
const MAX_SCORE = 1_000_000;

type Client = ReturnType<typeof createClient>;

async function readMode(client: Client, mode: string): Promise<Record<string, number>> {
  const raw = await client.hGetAll(`lb:${mode}`);
  const scores: Record<string, number> = {};
  for (const [name, value] of Object.entries(raw)) scores[name] = Number(value);
  return scores;
}

export default async function handler(req: Req, res: Res) {
  const url = process.env.REDIS_URL ?? process.env.KV_URL;
  if (!url) {
    const found = Object.keys(process.env).filter((key) => /REDIS|KV_|UPSTASH/.test(key));
    return res.status(503).json({ error: "Leaderboard storage is not configured", expected: ["REDIS_URL"], foundEnvNames: found });
  }

  const client = createClient({ url });
  try {
    await client.connect();

    if (req.method === "POST") {
      const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as { name?: unknown; mode?: unknown; score?: unknown };
      const name = typeof body?.name === "string" ? body.name.trim().slice(0, 16) : "";
      const mode = String(body?.mode);
      const score = Number(body?.score);
      if (name.length < 2 || !MODES.includes(mode) || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
        return res.status(400).json({ error: "Invalid score" });
      }
      const current = Number(await client.hGet(`lb:${mode}`, name)) || 0;
      if (score > current) await client.hSet(`lb:${mode}`, name, String(score));
      return res.status(200).json({ ok: true });
    }

    const mode = String(req.query.mode ?? "all");
    let totals: Record<string, number> = {};
    if (mode === "all") {
      // Overall = sum of each player's best score in every mode.
      for (const m of MODES) {
        const scores = await readMode(client, m);
        for (const [name, value] of Object.entries(scores)) totals[name] = (totals[name] ?? 0) + value;
      }
    } else if (MODES.includes(mode)) {
      totals = await readMode(client, mode);
    } else {
      return res.status(400).json({ error: "Unknown mode" });
    }
    const entries = Object.entries(totals).map(([name, score]) => ({ name, score })).sort((a, b) => b.score - a.score).slice(0, 50);
    return res.status(200).json({ entries });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Leaderboard error" });
  } finally {
    if (client.isOpen) await client.quit();
  }
}
