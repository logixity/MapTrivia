import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { handleDuel, memoryStore } from "./api/_duel";

// Local stand-in for /api/duel so multiplayer works with `vite dev` (state lives in this process).
function devDuelApi(): Plugin {
  const store = memoryStore();
  return {
    name: "dev-duel-api",
    configureServer(server) {
      server.middlewares.use("/api/duel", (req, res) => {
        let raw = "";
        req.on("data", (chunk) => (raw += chunk));
        req.on("end", async () => {
          try {
            const result = await handleDuel(store, JSON.parse(raw || "{}"));
            res.statusCode = result.status;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result.json));
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "Bad request" }));
          }
        });
      });
    },
  };
}

export default defineConfig({ plugins: [react(), devDuelApi()] });
