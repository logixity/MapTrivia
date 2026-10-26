// Vercel serverless function for multiplayer duels. Uses the same Redis database as the leaderboard (REDIS_URL).
import { createClient } from "redis";
import { handleDuel, Store } from "./_duel.js";

interface Req { method?: string; body?: unknown }
interface Res { status(code: number): Res; json(body: unknown): void }

interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { EX: number }): Promise<unknown>;
  hGetAll(key: string): Promise<Record<string, string>>;
  hSet(key: string, field: string, value: string): Promise<unknown>;
  hDel(key: string, field: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
}

function redisStore(client: RedisLike): Store {
  return {
    get: (key) => client.get(key),
    async set(key, value, ttl) {
      await client.set(key, value, { EX: ttl });
    },
    hGetAll: (key) => client.hGetAll(key),
    async hSet(key, field, value) {
      await client.hSet(key, field, value);
      await client.expire(key, 3600);
    },
    hDel: (key, field) => client.hDel(key, field),
  };
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const url = process.env.REDIS_URL ?? process.env.KV_URL;
  if (!url) return res.status(503).json({ error: "Multiplayer storage is not configured" });

  const client = createClient({ url });
  try {
    await client.connect();
    const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as Record<string, unknown>;
    const result = await handleDuel(redisStore(client), body ?? {});
    return res.status(result.status).json(result.json);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Duel error" });
  } finally {
    if (client.isOpen) await client.quit();
  }
}
