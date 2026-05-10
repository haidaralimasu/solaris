import type { AlertRule, AlertEvent } from "@/types/alerts";

const RULES_KEY = "solaris_alert_rules_v2";
const EVENTS_KEY = "solaris_alert_events_v2";
const MAX_EVENTS = 500;

export function loadRules(): AlertRule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RULES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRule(rule: AlertRule): void {
  const list = loadRules().filter((r) => r.id !== rule.id);
  localStorage.setItem(RULES_KEY, JSON.stringify([...list, rule]));
}

export function deleteRule(id: string): void {
  localStorage.setItem(
    RULES_KEY,
    JSON.stringify(loadRules().filter((r) => r.id !== id))
  );
}

export function updateRule(id: string, patch: Partial<AlertRule>): void {
  const list = loadRules().map((r) => (r.id === id ? { ...r, ...patch } : r));
  localStorage.setItem(RULES_KEY, JSON.stringify(list));
}

export function loadEvents(): AlertEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveEvents(events: AlertEvent[]): void {
  const existing = loadEvents();
  const merged = [...events, ...existing].slice(0, MAX_EVENTS);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(merged));
}

export function acknowledgeEvent(id: string): void {
  const list = loadEvents().map((e) =>
    e.id === id ? { ...e, acknowledged: true } : e
  );
  localStorage.setItem(EVENTS_KEY, JSON.stringify(list));
}

export function acknowledgeAll(): void {
  const list = loadEvents().map((e) => ({ ...e, acknowledged: true }));
  localStorage.setItem(EVENTS_KEY, JSON.stringify(list));
}
