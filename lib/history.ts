import type { SimulateResponse, Network } from "@/types/simulate";

export type SimulationRecord = {
  id: string;
  input: string;
  network: Network;
  timestamp: number;
  status: "success" | "failed" | "error";
  computeUnitsUsed: number;
  computeUnitsLimit: number;
  instructionCount: number;
  programIds: string[];
  result: SimulateResponse;
  mode?: "debug" | "simulate";
};

const STORAGE_KEY = "solaris_sim_history";
const MAX_HISTORY = 50;

export function loadHistory(): SimulationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SimulationRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(
  input: string,
  network: Network,
  result: SimulateResponse,
  mode?: "debug" | "simulate"
): SimulationRecord {
  const record: SimulationRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    input,
    network,
    timestamp: Date.now(),
    status: result.status,
    computeUnitsUsed: result.computeUnits.used,
    computeUnitsLimit: result.computeUnits.limit,
    instructionCount: result.instructions.length,
    programIds: [...new Set(result.instructions.map((i) => i.programId))],
    result,
    mode,
  };

  const history = loadHistory();
  const updated = [record, ...history].slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // storage full — remove oldest entries and retry
    const trimmed = [record, ...history].slice(0, 10);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)); } catch {}
  }
  return record;
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
