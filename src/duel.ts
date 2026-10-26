import { useEffect, useRef, useState } from "react";
import { Settings } from "./game";

export interface DuelSettings { mode: Settings["mode"]; continent: Settings["continent"]; timeLimit: number }
export interface DuelMatch { id: string; settings: DuelSettings; seed: number; opponent: string; startIn: number }
export interface Invite { id: string; from: string; settings: DuelSettings }
export interface Progress { correct: number; score: number; lives: number; finished: boolean; finishedAt?: number; age?: number }

// Per-tab id so two tabs can queue against each other.
export const clientId: string = (() => {
  let id = sessionStorage.getItem("maptrivia-client-id");
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("maptrivia-client-id", id);
  }
  return id;
})();

export async function duelApi<T = Record<string, unknown>>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch("/api/duel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id: clientId, ...payload }) });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export function toSettings(duel: DuelSettings, seed: number, language: Settings["language"]): Settings {
  return { mode: duel.mode, continent: duel.continent, timeLimit: duel.timeLimit, seed, language };
}

// Opponent counts as gone if they stop reporting for this long without finishing.
export const FORFEIT_AFTER_MS = 30_000;

export function usePresence(name: string) {
  const [online, setOnline] = useState<string[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [available, setAvailable] = useState(true);
  const dismissed = useRef(new Set<string>());

  useEffect(() => {
    if (!name) return;
    let stopped = false;
    async function beat() {
      try {
        const data = await duelApi<{ online: string[]; invites: Invite[] }>("presence", { name });
        if (stopped) return;
        setOnline(data.online);
        setInvites(data.invites.filter((invite) => !dismissed.current.has(invite.id)));
        setAvailable(true);
      } catch {
        if (!stopped) setAvailable(false);
      }
    }
    beat();
    const timer = setInterval(beat, 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [name]);

  function dismiss(id: string) {
    dismissed.current.add(id);
    setInvites((list) => list.filter((invite) => invite.id !== id));
  }

  return { online, invites, available, dismiss };
}
