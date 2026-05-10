"use client";

import { useState, useEffect } from "react";
import { loadHistory, clearHistory, type SimulationRecord } from "@/lib/history";

type Filter = "all" | "success" | "failed";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function shortInput(input: string): string {
  if (input.length <= 20) return input;
  return `${input.slice(0, 10)}…${input.slice(-6)}`;
}

function HistoryItem({
  record,
  isSelected,
  onSelect,
}: {
  record: SimulationRecord;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const pct =
    record.computeUnitsLimit > 0
      ? Math.round((record.computeUnitsUsed / record.computeUnitsLimit) * 100)
      : 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-3 py-3 rounded-lg border transition-all ${
        isSelected
          ? "border-[#F5A623]/30 bg-[#131920]"
          : "border-transparent hover:border-[#1E2632] hover:bg-[#131920]/50"
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
            record.status === "success" ? "bg-emerald-400" : "bg-red-400"
          }`}
        />
        <span className="font-mono text-[13px] font-medium text-[#C5D3DF] truncate flex-1">
          {shortInput(record.input)}
        </span>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 ${
            record.mode === "simulate"
              ? "bg-[#F5A623]/10 text-[#F5A623]"
              : "bg-[#1B2433] text-[#9AAFC2]"
          }`}
        >
          {record.mode === "simulate" ? "sim" : "dbg"}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-[#9AAFC2]">
        <span
          className={
            record.status === "success" ? "text-emerald-400 font-medium" : "text-red-400 font-medium"
          }
        >
          {record.status === "success" ? "Success" : "Failed"}
        </span>
        <span>·</span>
        <span>{record.instructionCount} ix</span>
        <span>·</span>
        <span>{pct}% CU</span>
        <span className="ml-auto">{timeAgo(record.timestamp)}</span>
      </div>
      <div className="mt-1.5 h-0.5 w-full rounded-full bg-[#131920]">
        <div
          className={`h-full rounded-full transition-all ${
            pct >= 90
              ? "bg-red-500"
              : pct >= 70
                ? "bg-[#F5A623]"
                : "bg-[#F5A623]/60"
          }`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </button>
  );
}

interface HistorySidebarProps {
  selectedId: string | null;
  onSelect: (record: SimulationRecord) => void;
  onHistoryChange?: (history: SimulationRecord[]) => void;
  mode: "debug" | "simulate";
}

export function HistorySidebar({
  selectedId,
  onSelect,
  onHistoryChange,
  mode,
}: HistorySidebarProps) {
  const [history, setHistory] = useState<SimulationRecord[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const loaded = loadHistory();
    setHistory(loaded);
    onHistoryChange?.(loaded);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClear() {
    clearHistory();
    setHistory([]);
    onHistoryChange?.([]);
  }

  useEffect(() => {
    const handler = () => {
      const loaded = loadHistory();
      setHistory(loaded);
      onHistoryChange?.(loaded);
    };
    window.addEventListener("solaris:history-updated", handler);
    return () => window.removeEventListener("solaris:history-updated", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = history.filter((r) => {
    if (r.mode !== mode) return false;
    if (filter === "success") return r.status === "success";
    if (filter === "failed") return r.status !== "success";
    return true;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3 pb-1 flex-shrink-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B8299] mb-2">
          History
        </p>
        <div className="flex items-center gap-0.5">
          {(["all", "success", "failed"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded px-2 py-1 text-[12px] font-semibold capitalize transition-colors ${
                filter === f
                  ? "bg-[#1B2433] text-[#F0F4F8]"
                  : "text-[#6B8299] hover:text-[#9AAFC2]"
              }`}
            >
              {f}
            </button>
          ))}
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="ml-auto text-xs text-[#6B8299] hover:text-[#F0F4F8] transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 mt-1">
        {filtered.length === 0 ? (
          <div className="pt-10 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[#1E2632] bg-[#0D1117]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-4 w-4 text-[#6B8299]"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
            </div>
            <p className="text-[13px] text-[#6B8299]">
              {history.length === 0 ? "No history yet" : `No ${filter} runs`}
            </p>
          </div>
        ) : (
          filtered.map((record) => (
            <HistoryItem
              key={record.id}
              record={record}
              isSelected={selectedId === record.id}
              onSelect={() => onSelect(record)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function notifyHistoryUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("solaris:history-updated"));
  }
}
