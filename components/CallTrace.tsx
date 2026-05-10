"use client";

import { useState } from "react";
import type { CallNode, Network } from "@/types/simulate";
import { accountUrl } from "@/lib/explorer";

function shortAddr(id: string): string {
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function StatusBadge({ status }: { status: CallNode["status"] }) {
  if (status === "success")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-900/60 bg-emerald-950/40 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
        <span className="h-1 w-1 rounded-full bg-emerald-400" />
        ok
      </span>
    );
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-600/80 bg-red-900/40 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-red-300">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
        FAILED
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#1E2632] bg-[#131920] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#475569]">
      <span className="h-1 w-1 rounded-full bg-[#475569]" />
      —
    </span>
  );
}

function ProgramIdActions({ programId, network }: { programId: string; network: Network }) {
  const [copied, setCopied] = useState(false);
  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(programId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <span className="hidden group-hover:inline-flex items-center gap-1 ml-1">
      <button
        onClick={copy}
        className="rounded px-1 py-0.5 text-[10px] text-[#475569] hover:text-[#F0F4F8] transition-colors"
        title="Copy program ID"
      >
        {copied ? "✓" : "⎘"}
      </button>
      <a
        href={accountUrl(programId, network)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="rounded px-1 py-0.5 text-[10px] text-[#475569] hover:text-[#F5A623] transition-colors"
        title="View on Solscan"
      >
        ↗
      </a>
    </span>
  );
}

function CallNodeView({
  node,
  isLast,
  depth,
  parentLines,
  baseDelay,
  network,
}: {
  node: CallNode;
  isLast: boolean;
  depth: number;
  parentLines: boolean[];
  baseDelay: number;
  network: Network;
}) {
  const isFailed = node.status === "failed";
  const [open, setOpen] = useState(isFailed ? true : depth < 3);

  const hasChildren = node.children.length > 0;
  const hasLogs = node.logs.filter((l) => !l.startsWith("Program ")).length > 0;
  const hasDetail = hasChildren || hasLogs || !!node.failReason;

  const label = node.programName ?? shortAddr(node.programId);

  const leftBorderColor = isFailed
    ? "border-red-500"
    : node.status === "success"
      ? "border-[#F5A623]/40"
      : "border-[#1E2632]";

  const treeLines = parentLines.map((hasMore) =>
    hasMore ? "│   " : "    "
  );

  return (
    <div
      className="trace-node"
      style={{ animationDelay: `${Math.min(baseDelay, 500)}ms` }}
    >
      {/* Node row */}
      <div
        className={`group flex items-start border-l-2 ${leftBorderColor} transition-all duration-150
          ${isFailed ? "bg-red-950/30" : ""}
          ${hasDetail ? "cursor-pointer hover:bg-white/[0.018]" : ""}
        `}
        onClick={() => hasDetail && setOpen((o) => !o)}
      >
        {/* Tree prefix */}
        <pre className="select-none font-mono text-xs text-[#2A3441] leading-none py-2.5 pr-1 pl-4">
          {treeLines.join("")}
          {depth > 0 ? (isLast ? "└─ " : "├─ ") : "   "}
        </pre>

        {/* Toggle chevron */}
        <span className="mt-2.5 mr-2 select-none text-[10px] text-[#2A3441]">
          {hasDetail ? (open ? "▼" : "▶") : " "}
        </span>

        {/* Content */}
        <div className="flex flex-1 items-center gap-3 py-2.5 pr-4 min-w-0">
          <span className={`font-mono text-[14px] font-semibold shrink-0 ${isFailed ? "text-red-300" : "text-[#F0F4F8]"}`}>
            {label}
          </span>

          <span className="hidden group-hover:inline font-mono text-xs text-[#6B8299] truncate max-w-[180px]">
            {node.programId}
          </span>

          <ProgramIdActions programId={node.programId} network={network} />

          <span className="flex-1" />

          {node.computeUnits !== undefined && (
            <span className={`font-mono text-xs tabular-nums shrink-0 ${
              node.status === "success" ? "text-[#F5A623]/60" : "text-[#475569]"
            }`}>
              {node.computeUnits.toLocaleString()} CU
            </span>
          )}

          <StatusBadge status={node.status} />
        </div>
      </div>

      {/* Fail reason — always visible for failed nodes */}
      {isFailed && node.failReason && (
        <div className="flex items-start gap-0">
          <pre className="select-none font-mono text-xs text-[#2A3441] leading-none py-2 pl-4 pr-1">
            {treeLines.join("")}
            {depth > 0 ? (isLast ? "    " : "│   ") : "   "}
            {"    "}
          </pre>
          <div className="flex-1 py-2 pr-4">
            <div className="rounded-lg border border-red-700/50 bg-red-950/60 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-red-500 text-xs font-bold">✕</span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">
                  Execution failed here
                </p>
              </div>
              <p className="font-mono text-sm text-red-300 leading-relaxed">{node.failReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Expanded: logs + children */}
      {open && hasDetail && (
        <div>
          {node.logs
            .filter((l) => !l.startsWith("Program "))
            .map((line, i) => (
              <div key={i} className="flex items-start gap-0">
                <pre className="select-none font-mono text-xs text-[#2A3441] leading-none py-1 pl-4 pr-1">
                  {treeLines.join("")}
                  {depth > 0 ? (isLast ? "    " : "│   ") : "   "}
                  {"    "}
                </pre>
                <span className="flex-1 py-1 pr-4 font-mono text-[13px] text-[#9AAFC2]">
                  {line.replace(/^Program log: /, "")}
                </span>
              </div>
            ))}

          {hasChildren &&
            node.children.map((child, i) => (
              <CallNodeView
                key={i}
                node={child}
                isLast={i === node.children.length - 1}
                depth={depth + 1}
                parentLines={[
                  ...parentLines,
                  depth > 0 ? !isLast : false,
                ]}
                baseDelay={baseDelay + (i + 1) * 50}
                network={network}
              />
            ))}
        </div>
      )}
    </div>
  );
}

interface CallTraceProps {
  trace: CallNode[];
  network: Network;
}

export function CallTrace({ trace, network }: CallTraceProps) {
  if (trace.length === 0) {
    return (
      <div className="rounded-xl border border-[#1E2632] bg-[#0D1117] px-5 py-8 text-center">
        <p className="text-sm text-[#475569]">No call trace available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1E2632] bg-[#0D1117] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[#131920]">
        <span className="text-[13px] font-bold uppercase tracking-widest text-[#9AAFC2]">
          Call Trace
        </span>
        <span className="rounded bg-[#1B2433] px-1.5 py-0.5 text-xs font-semibold text-[#9AAFC2]">
          {trace.length} root call{trace.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="py-2">
        {trace.map((node, i) => (
          <CallNodeView
            key={i}
            node={node}
            isLast={i === trace.length - 1}
            depth={0}
            parentLines={[]}
            baseDelay={i * 60}
            network={network}
          />
        ))}
      </div>
    </div>
  );
}
