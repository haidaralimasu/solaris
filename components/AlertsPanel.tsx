"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  AlertRule,
  AlertEvent,
  AlertCondition,
  AlertConditionType,
  NotifyChannel,
} from "@/types/alerts";
import type { Network } from "@/types/simulate";
import type { AlertCheckResponse } from "@/types/alerts";
import {
  loadRules,
  saveRule,
  deleteRule,
  updateRule,
  loadEvents,
  saveEvents,
  acknowledgeEvent,
  acknowledgeAll,
} from "@/lib/alertStorage";

const POLL_INTERVAL_MS = 12_000;
const NETWORKS: Network[] = ["mainnet-beta", "devnet"];

function shortAddr(addr: string) {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

const CONDITION_LABELS: Record<AlertConditionType, string> = {
  any_activity: "Any activity",
  instruction_discriminator: "Instruction match",
  error_events: "Error events",
  large_sol_transfer: "Large SOL transfer",
};

// ─── Rule Form ────────────────────────────────────────────────────────────────

interface RuleFormState {
  name: string;
  programId: string;
  network: Network;
  conditions: AlertCondition[];
  notifyVia: NotifyChannel[];
}

const EMPTY_RULE_FORM: RuleFormState = {
  name: "",
  programId: "",
  network: "mainnet-beta",
  conditions: [{ type: "any_activity" }],
  notifyVia: ["in_app"],
};

function ConditionEditor({
  conditions,
  onChange,
}: {
  conditions: AlertCondition[];
  onChange: (c: AlertCondition[]) => void;
}) {
  function addCondition(type: AlertConditionType) {
    let cond: AlertCondition;
    if (type === "any_activity") cond = { type };
    else if (type === "error_events") cond = { type };
    else if (type === "instruction_discriminator") cond = { type, discriminator: "" };
    else cond = { type: "large_sol_transfer", thresholdSol: 100 };
    onChange([...conditions, cond]);
  }

  function updateCond(i: number, cond: AlertCondition) {
    const next = [...conditions];
    next[i] = cond;
    onChange(next);
  }

  function removeCond(i: number) {
    onChange(conditions.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
          Alert Conditions
        </label>
        <div className="relative group">
          <button className="text-[11px] font-semibold text-[#F5A623] hover:text-[#F5A623]/70 transition-colors">
            + Add condition
          </button>
          <div className="hidden group-hover:block absolute right-0 top-5 z-10 w-48 rounded-xl border border-[#1E2632] bg-[#0D1117] py-1 shadow-2xl">
            {(["any_activity", "error_events", "instruction_discriminator", "large_sol_transfer"] as AlertConditionType[]).map((t) => (
              <button
                key={t}
                onClick={() => addCondition(t)}
                className="w-full text-left px-3 py-1.5 text-[12px] text-[#9AAFC2] hover:bg-white/[0.03] hover:text-[#F0F4F8] transition-colors"
              >
                {CONDITION_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {conditions.length === 0 && (
        <p className="text-[12px] italic text-[#2A3441]">No conditions — add at least one</p>
      )}

      {conditions.map((cond, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg border border-[#1B2433] bg-[#080B14] px-3 py-2">
          <span className="text-[12px] font-semibold text-[#9AAFC2] flex-1">
            {CONDITION_LABELS[cond.type]}
          </span>

          {cond.type === "instruction_discriminator" && (
            <input
              value={cond.discriminator}
              onChange={(e) => updateCond(i, { type: "instruction_discriminator", discriminator: e.target.value.trim() })}
              placeholder="8-byte hex discriminator"
              className="w-48 rounded border border-[#1B2433] bg-[#0A0D16] px-2 py-1 font-mono text-[11px] text-[#F5A623]/80 placeholder-[#2A3441] outline-none focus:border-[#F5A623]/30 transition-colors"
            />
          )}

          {cond.type === "large_sol_transfer" && (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                value={cond.thresholdSol}
                onChange={(e) => updateCond(i, { type: "large_sol_transfer", thresholdSol: parseFloat(e.target.value) || 0 })}
                className="w-20 rounded border border-[#1B2433] bg-[#0A0D16] px-2 py-1 text-[11px] text-[#9AAFC2] outline-none focus:border-[#F5A623]/30 transition-colors"
              />
              <span className="text-[11px] text-[#475569]">SOL</span>
            </div>
          )}

          <button
            onClick={() => removeCond(i)}
            className="text-[#2A3441] hover:text-red-400 transition-colors pl-1 text-[11px]"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

function AlertRuleForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: AlertRule;
  onSave: (rule: AlertRule) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<RuleFormState>(
    initial
      ? {
          name: initial.name,
          programId: initial.programId,
          network: initial.network,
          conditions: initial.conditions,
          notifyVia: initial.notifyVia,
        }
      : EMPTY_RULE_FORM
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.programId.trim()) e.programId = "Program ID is required";
    if (form.conditions.length === 0) e.conditions = "Add at least one condition";
    if (form.notifyVia.length === 0) e.notifyVia = "Select at least one notification channel";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function toggleChannel(ch: NotifyChannel) {
    setForm((f) => ({
      ...f,
      notifyVia: f.notifyVia.includes(ch)
        ? f.notifyVia.filter((c) => c !== ch)
        : [...f.notifyVia, ch],
    }));
  }

  function submit() {
    if (!validate()) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: form.name.trim(),
      programId: form.programId.trim(),
      network: form.network,
      conditions: form.conditions,
      notifyVia: form.notifyVia,
      enabled: initial?.enabled ?? true,
      createdAt: initial?.createdAt ?? Date.now(),
      lastCheckedAt: initial?.lastCheckedAt,
      lastSignatureSeen: initial?.lastSignatureSeen,
    });
  }

  return (
    <div className="rounded-xl border border-[#1E2632] bg-[#0D1117] p-5 space-y-4">
      <h3 className="text-[14px] font-bold text-[#F0F4F8]">
        {initial ? "Edit Alert Rule" : "New Alert Rule"}
      </h3>

      {/* Name + Network */}
      <div className="flex gap-3">
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">Name *</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Suspicious large transfer"
            className="w-full rounded-lg border border-[#1B2433] bg-[#080B14] px-3 py-2 text-[13px] text-[#F0F4F8] placeholder-[#2A3441] outline-none focus:border-[#F5A623]/40 transition-colors"
          />
          {errors.name && <p className="text-[11px] text-red-400">{errors.name}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">Network</label>
          <select
            value={form.network}
            onChange={(e) => setForm((f) => ({ ...f, network: e.target.value as Network }))}
            className="rounded-lg border border-[#1B2433] bg-[#080B14] px-3 py-2 text-[13px] text-[#9AAFC2] outline-none focus:border-[#F5A623]/40 transition-colors"
          >
            {NETWORKS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Program ID */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">Program ID to Monitor *</label>
        <input
          value={form.programId}
          onChange={(e) => setForm((f) => ({ ...f, programId: e.target.value.trim() }))}
          placeholder="Base58 program address"
          className="w-full rounded-lg border border-[#1B2433] bg-[#080B14] px-3 py-2 font-mono text-[13px] text-[#9AAFC2] placeholder-[#2A3441] outline-none focus:border-[#F5A623]/40 transition-colors"
        />
        {errors.programId && <p className="text-[11px] text-red-400">{errors.programId}</p>}
      </div>

      {/* Conditions */}
      <ConditionEditor
        conditions={form.conditions}
        onChange={(c) => setForm((f) => ({ ...f, conditions: c }))}
      />
      {errors.conditions && <p className="text-[11px] text-red-400">{errors.conditions}</p>}

      {/* Notify via */}
      <div className="space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
          Notify via
        </label>
        <div className="flex gap-3">
          {(["in_app", "browser"] as NotifyChannel[]).map((ch) => (
            <label key={ch} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.notifyVia.includes(ch)}
                onChange={() => toggleChannel(ch)}
                className="h-3.5 w-3.5 accent-[#F5A623]"
              />
              <span className="text-[12px] text-[#9AAFC2]">
                {ch === "in_app" ? "In-app" : "Browser notification"}
              </span>
            </label>
          ))}
        </div>
        {errors.notifyVia && <p className="text-[11px] text-red-400">{errors.notifyVia}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={submit}
          className="rounded-xl bg-[#F5A623] px-5 py-2 text-[13px] font-bold text-[#080B14] hover:bg-[#F5A623]/90 transition-colors"
        >
          {initial ? "Save Changes" : "Create Rule"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl border border-[#1E2632] px-5 py-2 text-[13px] font-semibold text-[#6B8299] hover:text-[#9AAFC2] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Polling engine hook ──────────────────────────────────────────────────────

function useAlertPolling(
  rules: AlertRule[],
  onNewEvents: (events: AlertEvent[]) => void
) {
  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  const poll = useCallback(async () => {
    const enabledRules = rulesRef.current.filter((r) => r.enabled);
    if (enabledRules.length === 0) return;

    const results = await Promise.allSettled(
      enabledRules.map(async (rule) => {
        const res = await fetch("/api/alerts/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            programId: rule.programId,
            network: rule.network,
            afterSignature: rule.lastSignatureSeen,
            conditions: rule.conditions,
          }),
        });

        if (!res.ok) throw new Error(`Poll failed for rule ${rule.id}`);

        const data: AlertCheckResponse = await res.json();

        if (data.latestSignature && data.latestSignature !== rule.lastSignatureSeen) {
          updateRule(rule.id, {
            lastCheckedAt: Date.now(),
            lastSignatureSeen: data.latestSignature,
          });
        } else {
          updateRule(rule.id, { lastCheckedAt: Date.now() });
        }

        return { rule, matches: data.matches };
      })
    );

    const newEvents: AlertEvent[] = [];
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const { rule, matches } = result.value;
      for (const match of matches) {
        newEvents.push({
          id: crypto.randomUUID(),
          ruleId: rule.id,
          ruleName: rule.name,
          signature: match.signature,
          network: rule.network,
          programId: rule.programId,
          conditionMatched: match.conditionMatched,
          status: match.status,
          timestamp: match.blockTime ? match.blockTime * 1000 : Date.now(),
          acknowledged: false,
        });

        if (rule.notifyVia.includes("browser") && typeof window !== "undefined") {
          if (Notification.permission === "granted") {
            new Notification(`Solaris Alert: ${rule.name}`, {
              body: `${CONDITION_LABELS[match.conditionMatched]} detected on ${shortAddr(rule.programId)}`,
              icon: "/favicon.ico",
            });
          }
        }
      }
    }

    if (newEvents.length > 0) {
      saveEvents(newEvents);
      onNewEvents(newEvents);
    }
  }, [onNewEvents]);

  useEffect(() => {
    if (rules.filter((r) => r.enabled).length === 0) return;

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [rules, poll]);
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function AlertsPanel() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<AlertRule | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"rules" | "events">("rules");
  const [unread, setUnread] = useState(0);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    setRules(loadRules());
    const evs = loadEvents();
    setEvents(evs);
    setUnread(evs.filter((e) => !e.acknowledged).length);
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const handleNewEvents = useCallback((newEvts: AlertEvent[]) => {
    setEvents(loadEvents());
    setUnread((u) => u + newEvts.length);
  }, []);

  useAlertPolling(rules, handleNewEvents);

  function handleSaveRule(rule: AlertRule) {
    saveRule(rule);
    setRules(loadRules());
    setShowForm(false);
    setEditTarget(undefined);
  }

  function handleDeleteRule(id: string) {
    deleteRule(id);
    setRules(loadRules());
    setDeletingId(null);
  }

  function toggleRule(id: string, enabled: boolean) {
    updateRule(id, { enabled });
    setRules(loadRules());
  }

  function handleAck(id: string) {
    acknowledgeEvent(id);
    const evs = loadEvents();
    setEvents(evs);
    setUnread(evs.filter((e) => !e.acknowledged).length);
  }

  function handleAckAll() {
    acknowledgeAll();
    const evs = loadEvents();
    setEvents(evs);
    setUnread(0);
  }

  async function requestBrowserPermission() {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);
  }

  const unacknowledgedEvents = events.filter((e) => !e.acknowledged);
  const acknowledgedEvents = events.filter((e) => e.acknowledged);

  return (
    <div className="flex h-full min-h-screen flex-col">
      {/* Header */}
      <div className="border-b border-[#131920] px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-bold text-[#F0F4F8]">Alerts</h1>
            <p className="mt-0.5 text-[13px] text-[#475569]">
              Monitor on-chain programs in real time. Polls every {POLL_INTERVAL_MS / 1000}s.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {browserPermission === "default" && (
              <button
                onClick={requestBrowserPermission}
                className="flex items-center gap-1.5 rounded-xl border border-[#1B2433] px-3 py-2 text-[12px] font-semibold text-[#475569] hover:text-[#9AAFC2] transition-colors"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M4.214 3.227a.75.75 0 0 0-1.156-.956 8.97 8.97 0 0 0-1.856 5.285.75.75 0 0 0 1.498.063 7.47 7.47 0 0 1 1.514-4.392Zm11.730 .987a.75.75 0 0 0-1.156.956 7.47 7.47 0 0 1 1.514 4.392.75.75 0 0 0 1.498-.063 8.97 8.97 0 0 0-1.856-5.285ZM10 2a6 6 0 0 0-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 0 0 .515 1.076 32.094 32.094 0 0 0 3.256.508 3.5 3.5 0 0 0 6.972 0 32.093 32.093 0 0 0 3.256-.508.75.75 0 0 0 .515-1.076A11.448 11.448 0 0 1 16 8a6 6 0 0 0-6-6Zm0 14.5a2 2 0 0 1-1.95-1.557 32.433 32.433 0 0 0 3.9 0A2 2 0 0 1 10 16.5Z" />
                </svg>
                Enable notifications
              </button>
            )}
            {!showForm && (
              <button
                onClick={() => { setShowForm(true); setEditTarget(undefined); }}
                className="rounded-xl bg-[#F5A623] px-4 py-2 text-[13px] font-bold text-[#080B14] hover:bg-[#F5A623]/90 transition-colors"
              >
                + New Rule
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex items-center gap-0 border-b border-[#131920] -mb-5">
          <button
            onClick={() => setTab("rules")}
            className={`relative px-4 py-2.5 text-[13px] font-semibold transition-colors focus:outline-none ${
              tab === "rules"
                ? "text-[#F5A623] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-[#F5A623]"
                : "text-[#6B8299] hover:text-[#9AAFC2]"
            }`}
          >
            Rules
            <span className={`ml-1.5 rounded px-1 py-0.5 text-[10px] font-bold ${
              tab === "rules" ? "bg-[#F5A623]/10 text-[#F5A623]" : "bg-[#1B2433] text-[#6B8299]"
            }`}>
              {rules.length}
            </span>
          </button>
          <button
            onClick={() => { setTab("events"); setUnread(0); }}
            className={`relative px-4 py-2.5 text-[13px] font-semibold transition-colors focus:outline-none ${
              tab === "events"
                ? "text-[#F5A623] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-[#F5A623]"
                : "text-[#6B8299] hover:text-[#9AAFC2]"
            }`}
          >
            Events
            {unread > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-4">
        {/* Form */}
        {tab === "rules" && showForm && (
          <AlertRuleForm
            initial={editTarget}
            onSave={handleSaveRule}
            onCancel={() => { setShowForm(false); setEditTarget(undefined); }}
          />
        )}

        {/* Rules tab */}
        {tab === "rules" && (
          <>
            {rules.length === 0 && !showForm ? (
              <div className="rounded-xl border border-[#1E2632] bg-[#0D1117] px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#080B14] border border-[#1E2632] mx-auto mb-3">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 text-[#2A3441]">
                    <path d="M4.214 3.227a.75.75 0 0 0-1.156-.956 8.97 8.97 0 0 0-1.856 5.285.75.75 0 0 0 1.498.063 7.47 7.47 0 0 1 1.514-4.392Zm11.730 .987a.75.75 0 0 0-1.156.956 7.47 7.47 0 0 1 1.514 4.392.75.75 0 0 0 1.498-.063 8.97 8.97 0 0 0-1.856-5.285ZM10 2a6 6 0 0 0-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 0 0 .515 1.076 32.094 32.094 0 0 0 3.256.508 3.5 3.5 0 0 0 6.972 0 32.093 32.093 0 0 0 3.256-.508.75.75 0 0 0 .515-1.076A11.448 11.448 0 0 1 16 8a6 6 0 0 0-6-6Zm0 14.5a2 2 0 0 1-1.95-1.557 32.433 32.433 0 0 0 3.9 0A2 2 0 0 1 10 16.5Z" />
                  </svg>
                </div>
                <p className="text-[14px] font-semibold text-[#475569]">No alert rules yet</p>
                <p className="mt-1 text-[12px] text-[#2A3441]">
                  Add a program to monitor and set conditions for when you want to be notified.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/20 px-4 py-2 text-[13px] font-semibold text-[#F5A623] hover:bg-[#F5A623]/15 transition-colors"
                >
                  Create your first rule
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="rounded-xl border border-[#1E2632] bg-[#0D1117] overflow-hidden">
                    <div className="flex items-center gap-4 px-5 py-4">
                      {/* Toggle */}
                      <button
                        onClick={() => toggleRule(rule.id, !rule.enabled)}
                        className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${
                          rule.enabled ? "bg-[#F5A623]" : "bg-[#1E2632]"
                        }`}
                        title={rule.enabled ? "Disable" : "Enable"}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                          rule.enabled ? "left-4.5 left-[18px]" : "left-0.5"
                        }`} />
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-bold text-[#F0F4F8]">{rule.name}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            rule.network === "mainnet-beta"
                              ? "bg-[#F5A623]/10 text-[#F5A623]"
                              : "bg-emerald-900/30 text-emerald-400"
                          }`}>
                            {rule.network === "mainnet-beta" ? "mainnet" : "devnet"}
                          </span>
                          {rule.enabled && (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Live
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[11px] text-[#2A3441] mt-0.5">
                          {shortAddr(rule.programId)}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {rule.conditions.map((c, i) => (
                            <span
                              key={i}
                              className="rounded bg-[#131920] px-2 py-0.5 text-[10px] text-[#475569]"
                            >
                              {CONDITION_LABELS[c.type]}
                              {c.type === "instruction_discriminator" && c.discriminator && (
                                <span className="ml-1 font-mono text-[#F5A623]/60">{c.discriminator.slice(0, 8)}…</span>
                              )}
                              {c.type === "large_sol_transfer" && (
                                <span className="ml-1 text-[#F5A623]/60">&gt;{c.thresholdSol} SOL</span>
                              )}
                            </span>
                          ))}
                        </div>
                        {rule.lastCheckedAt && (
                          <p className="text-[10px] text-[#2A3441] mt-1">
                            Last checked {timeAgo(rule.lastCheckedAt)}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => { setEditTarget(rule); setShowForm(true); }}
                          className="rounded-lg border border-[#1B2433] px-3 py-1.5 text-[12px] font-semibold text-[#475569] hover:text-[#9AAFC2] transition-colors"
                        >
                          Edit
                        </button>
                        {deletingId === rule.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="rounded-lg bg-red-900/40 border border-red-700/40 px-3 py-1.5 text-[12px] font-bold text-red-300 hover:bg-red-900/60 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="rounded-lg px-2 py-1.5 text-[12px] text-[#475569] hover:text-[#9AAFC2] transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(rule.id)}
                            className="rounded-lg border border-[#1B2433] px-3 py-1.5 text-[12px] font-semibold text-[#475569] hover:text-red-400 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Events tab */}
        {tab === "events" && (
          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="rounded-xl border border-[#1E2632] bg-[#0D1117] px-6 py-12 text-center">
                <p className="text-[14px] font-semibold text-[#475569]">No alert events yet</p>
                <p className="mt-1 text-[12px] text-[#2A3441]">Events will appear here when your rules match on-chain activity.</p>
              </div>
            ) : (
              <>
                {unacknowledgedEvents.length > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-semibold text-[#F0F4F8]">
                      {unacknowledgedEvents.length} new event{unacknowledgedEvents.length !== 1 ? "s" : ""}
                    </p>
                    <button
                      onClick={handleAckAll}
                      className="text-[11px] font-semibold text-[#475569] hover:text-[#9AAFC2] transition-colors"
                    >
                      Mark all read
                    </button>
                  </div>
                )}

                {[...unacknowledgedEvents, ...acknowledgedEvents].map((event) => {
                  const explorerUrl =
                    event.network === "mainnet-beta"
                      ? `https://solscan.io/tx/${event.signature}`
                      : `https://solscan.io/tx/${event.signature}?cluster=devnet`;

                  return (
                    <div
                      key={event.id}
                      className={`rounded-xl border overflow-hidden transition-colors ${
                        event.acknowledged
                          ? "border-[#131920] bg-[#080B14]"
                          : "border-[#1E2632] bg-[#0D1117]"
                      }`}
                    >
                      <div className="flex items-start gap-4 px-5 py-3.5">
                        <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                          event.status === "failed" ? "bg-red-500" : "bg-emerald-500"
                        } ${!event.acknowledged ? "animate-pulse" : ""}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-[13px] font-bold ${event.acknowledged ? "text-[#475569]" : "text-[#F0F4F8]"}`}>
                              {event.ruleName}
                            </p>
                            <span className="rounded bg-[#131920] px-1.5 py-0.5 text-[10px] text-[#475569]">
                              {CONDITION_LABELS[event.conditionMatched]}
                            </span>
                          </div>
                          <a
                            href={explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[11px] text-[#475569] hover:text-[#F5A623] transition-colors"
                          >
                            {shortAddr(event.signature)} ↗
                          </a>
                          <p className="text-[10px] text-[#2A3441] mt-0.5">
                            {timeAgo(event.timestamp)} · {event.network === "mainnet-beta" ? "mainnet" : "devnet"}
                          </p>
                        </div>
                        {!event.acknowledged && (
                          <button
                            onClick={() => handleAck(event.id)}
                            className="shrink-0 rounded-lg border border-[#1B2433] px-2.5 py-1 text-[11px] font-semibold text-[#475569] hover:text-[#9AAFC2] transition-colors"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
