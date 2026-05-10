"use client";

import { useState, useMemo } from "react";

interface ProgramLogViewerProps {
  logs: string[];
}

function lineColor(line: string): string {
  if (line.includes("failed") || line.includes("error")) return "text-red-400";
  if (line.includes("success")) return "text-emerald-500";
  if (line.startsWith("Program log:")) return "text-[#94A3B8]";
  if (line.startsWith("Program data:")) return "text-[#F5A623]/70";
  if (line.includes("invoke")) return "text-[#475569]";
  if (line.includes("consumed")) return "text-[#2A3441]";
  return "text-[#475569]";
}

function isErrorLine(line: string): boolean {
  return line.includes("failed") || line.includes("error") || line.includes("Error");
}

export function ProgramLogViewer({ logs }: ProgramLogViewerProps) {
  const [query, setQuery] = useState("");
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const PREVIEW_COUNT = 15;

  const filtered = useMemo(() => {
    let result = logs;
    if (errorsOnly) result = result.filter(isErrorLine);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((l) => l.toLowerCase().includes(q));
    }
    return result;
  }, [logs, query, errorsOnly]);

  const visible = expanded ? filtered : filtered.slice(0, PREVIEW_COUNT);
  const hasMore = filtered.length > PREVIEW_COUNT;

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-[#1E2632] bg-[#0D1117] px-5 py-8 text-center">
        <p className="text-sm text-[#475569]">No program logs.</p>
      </div>
    );
  }

  const errorCount = logs.filter(isErrorLine).length;

  return (
    <div className="rounded-xl border border-[#1E2632] bg-[#0D1117] overflow-hidden">
      {/* Header + controls */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[#131920] px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
          Program Logs
        </span>
        <span className="rounded bg-[#131920] px-1.5 py-0.5 text-[10px] text-[#475569]">
          {filtered.length}{filtered.length !== logs.length ? ` / ${logs.length}` : ""} lines
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* Errors-only toggle */}
          {errorCount > 0 && (
            <button
              type="button"
              onClick={() => { setErrorsOnly((v) => !v); setExpanded(false); }}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                errorsOnly
                  ? "border-red-700/60 bg-red-950/40 text-red-400"
                  : "border-[#1B2433] text-[#475569] hover:text-red-400 hover:border-red-900/40"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Errors ({errorCount})
            </button>
          )}

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setExpanded(false); }}
              placeholder="Search logs…"
              className="h-7 w-44 rounded-lg border border-[#1B2433] bg-[#080B14] px-3 pr-7 text-[12px] text-[#9AAFC2] placeholder-[#2A3441] outline-none focus:border-[#F5A623]/40 transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#9AAFC2] text-[10px]"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Terminal block */}
      <div className="bg-[#080B14] p-4">
        {visible.length === 0 ? (
          <p className="font-mono text-xs text-[#2A3441]">No matching lines.</p>
        ) : (
          <ol className="space-y-0.5 font-mono text-xs">
            {visible.map((line, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 shrink-0 select-none text-right text-[#1E2632] tabular-nums">
                  {i + 1}
                </span>
                <span className={lineColor(line)}>{line}</span>
              </li>
            ))}
          </ol>
        )}

        {hasMore && !expanded && (
          <div className="mt-3 border-t border-[#131920] pt-3">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="font-mono text-xs text-[#475569] hover:text-[#F5A623] transition-colors"
            >
              + {filtered.length - PREVIEW_COUNT} more lines — click to expand
            </button>
          </div>
        )}
        {expanded && hasMore && (
          <div className="mt-3 border-t border-[#131920] pt-3">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="font-mono text-xs text-[#475569] hover:text-[#F5A623] transition-colors"
            >
              ↑ Collapse
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
