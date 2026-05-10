import type { CircuitBreaker, CBExecution } from "@/types/circuitBreaker";

const CB_KEY = "solaris_circuit_breakers_v2";
const EXEC_KEY = "solaris_cb_executions_v2";
const MAX_EXECUTIONS = 100;

export function loadBreakers(): CircuitBreaker[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CB_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBreaker(cb: CircuitBreaker): void {
  const list = loadBreakers().filter((c) => c.id !== cb.id);
  localStorage.setItem(CB_KEY, JSON.stringify([...list, cb]));
}

export function deleteBreaker(id: string): void {
  localStorage.setItem(
    CB_KEY,
    JSON.stringify(loadBreakers().filter((c) => c.id !== id))
  );
}

export function updateBreakerAfterFire(
  id: string,
  signature: string
): void {
  const list = loadBreakers().map((cb) =>
    cb.id === id
      ? { ...cb, lastFiredAt: Date.now(), lastSignature: signature }
      : cb
  );
  localStorage.setItem(CB_KEY, JSON.stringify(list));
}

export function loadExecutions(): CBExecution[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EXEC_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveExecution(exec: CBExecution): void {
  const list = [exec, ...loadExecutions()].slice(0, MAX_EXECUTIONS);
  localStorage.setItem(EXEC_KEY, JSON.stringify(list));
}
