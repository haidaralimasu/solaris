"use client";

import { useState } from "react";
import type { CallNode } from "@/types/simulate";

function shortAddr(id: string): string {
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

// Known Solana program IDs → accent color
const PROGRAM_ID_ACCENTS: Record<string, string> = {
  "11111111111111111111111111111111": "#64748B",                    // System Program
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": "#F5A623",       // Token Program
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb": "#F59E0B",       // Token-2022
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bC": "#FBBF24",       // ATA
  "ComputeBudget111111111111111111111111111111": "#475569",          // Compute Budget
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4": "#3B82F6",       // Jupiter v6
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3sFKDcc": "#14B8A6",       // Orca Whirlpool
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "#A855F7",      // Raydium AMM
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK": "#C084FC",      // Raydium CLMM
  "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD": "#0EA5E9",       // Marinade
  "MFv2hWf31Z9kbCa1snEPdcgp168vLBd6o8dAzBFBEKW": "#22C55E",       // Marginfi
  "mv3ekLzLbnVPNxjSKvqBpU3ZeZXPQdEC3bp5MDEBG68": "#22C55E",        // Marginfi v2
  "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH": "#F97316",        // Drift
  "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin": "#F97316",       // Serum
  "opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb": "#F97316",        // OpenBook
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo": "#8B5CF6",       // Meteora DLMM
  "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EkAW7cP": "#8B5CF6",       // Meteora
  "SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ": "#A78BFA",        // Saber
  "DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1": "#A78BFA",      // Saber Stableswap
  "BSwp6bEBihVLdqkRKGcMtFkXfwgUX4JNPF9LLbQSEh": "#EC4899",        // Balansol
  "worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth": "#6366F1",        // Wormhole
  "wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb": "#6366F1",        // Wormhole token bridge
  "jito...": "#F97316",
};

// Fallback: match by program name substring
const NAME_ACCENTS: Array<[string, string]> = [
  ["jupiter", "#3B82F6"],
  ["orca", "#14B8A6"],
  ["whirlpool", "#14B8A6"],
  ["raydium", "#A855F7"],
  ["marinade", "#0EA5E9"],
  ["marginfi", "#22C55E"],
  ["meteora", "#8B5CF6"],
  ["drift", "#F97316"],
  ["serum", "#F97316"],
  ["openbook", "#F97316"],
  ["wormhole", "#6366F1"],
  ["saber", "#A78BFA"],
  ["kamino", "#EC4899"],
  ["jito", "#F97316"],
  ["token", "#F5A623"],
  ["system", "#64748B"],
  ["compute", "#475569"],
  ["memo", "#475569"],
  ["associated", "#FBBF24"],
  ["stake", "#38BDF8"],
  ["vote", "#94A3B8"],
  ["nft", "#EC4899"],
  ["metaplex", "#EC4899"],
  ["candy", "#EC4899"],
];

function getAccent(node: CallNode): string {
  if (node.status === "failed") return "#EF4444";
  const byId = PROGRAM_ID_ACCENTS[node.programId];
  if (byId) return byId;
  if (node.programName) {
    const lower = node.programName.toLowerCase();
    for (const [key, color] of NAME_ACCENTS) {
      if (lower.includes(key)) return color;
    }
  }
  return "#9AAFC2";
}

// Count total descendants
function totalDescendants(node: CallNode): number {
  return node.children.reduce((acc, c) => acc + 1 + totalDescendants(c), 0);
}

interface VisualNodeProps {
  node: CallNode;
  depth: number;
  isLast: boolean;
  maxCU: number;
  index: number;
}

function VisualNode({ node, depth, isLast, maxCU, index }: VisualNodeProps) {
  const isFailed = node.status === "failed";
  const hasChildren = node.children.length > 0;
  const [open, setOpen] = useState(isFailed || depth < 4);

  const accent = getAccent(node);
  const label = node.programName ?? shortAddr(node.programId);
  const cuPct = node.computeUnits && maxCU > 0
    ? Math.min((node.computeUnits / maxCU) * 100, 100)
    : 0;
  const desc = totalDescendants(node);

  return (
    <div
      className="trace-node"
      style={{ animationDelay: `${Math.min(index * 35, 400)}ms` }}
    >
      {/* Card */}
      <div
        onClick={() => hasChildren && setOpen((o) => !o)}
        className={`group relative flex items-stretch rounded-xl border overflow-hidden transition-all duration-150
          ${hasChildren ? "cursor-pointer" : ""}
          ${isFailed
            ? "border-red-600/50 bg-red-950/30 hover:bg-red-950/50"
            : "border-[#1E2632] bg-[#0D1117] hover:border-[#243344] hover:bg-[#111820]"
          }
        `}
        style={isFailed ? { boxShadow: "0 0 16px rgba(239,68,68,0.15)" } : undefined}
      >
        {/* Protocol accent bar */}
        <div
          className="w-[3px] flex-shrink-0"
          style={{ background: accent, opacity: isFailed ? 1 : 0.8 }}
        />

        <div className="flex-1 px-4 py-3 min-w-0">
          {/* Top row: status + name + toggle */}
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2 w-2 rounded-full flex-shrink-0 ${
                isFailed
                  ? "bg-red-400 animate-pulse"
                  : node.status === "success"
                    ? "bg-emerald-400"
                    : "bg-[#475569]"
              }`}
            />

            <span
              className={`font-mono text-[13px] font-bold truncate ${
                isFailed ? "text-red-300" : "text-[#F0F4F8]"
              }`}
            >
              {label}
            </span>

            {/* CPI depth badge */}
            {depth > 0 && (
              <span
                className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold flex-shrink-0"
                style={{
                  background: `${accent}18`,
                  color: accent,
                  border: `1px solid ${accent}30`,
                }}
              >
                CPI {depth}
              </span>
            )}

            <div className="flex-1" />

            {hasChildren && (
              <span className="flex-shrink-0 text-[11px] font-semibold text-[#6B8299] group-hover:text-[#9AAFC2] transition-colors">
                {open ? "▾" : "▸"} {desc} sub
              </span>
            )}
          </div>

          {/* Program address (hover) */}
          <p className="mt-0.5 font-mono text-[11px] text-[#475569] truncate group-hover:text-[#6B8299] transition-colors">
            {node.programId}
          </p>

          {/* CU bar */}
          {node.computeUnits !== undefined && (
            <div className="mt-2.5">
              <div className="h-1 w-full rounded-full bg-[#131920] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${cuPct}%`,
                    background: isFailed
                      ? "linear-gradient(90deg, #EF4444, #DC2626)"
                      : `linear-gradient(90deg, ${accent}99, ${accent})`,
                  }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-mono text-[11px] text-[#6B8299]">
                  {node.computeUnits.toLocaleString()} CU
                </span>
                {maxCU > 0 && (
                  <span className="font-mono text-[11px] text-[#475569]">
                    {cuPct.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Fail reason */}
          {isFailed && node.failReason && (
            <div className="mt-2.5 rounded-lg border border-red-700/40 bg-red-950/50 px-3 py-2">
              <p className="font-mono text-[12px] leading-relaxed text-red-300">{node.failReason}</p>
            </div>
          )}

          {/* Logs (filtered, collapsed by default on subtrees) */}
          {open && node.logs.filter((l) => !l.startsWith("Program ")).slice(0, 3).map((log, i) => (
            <p key={i} className="mt-1 font-mono text-[11px] text-[#475569] truncate">
              {log.replace(/^Program log: /, "")}
            </p>
          ))}
        </div>
      </div>

      {/* Children with connector lines */}
      {open && hasChildren && (
        <div className="mt-2 ml-5 space-y-2 relative">
          {/* Vertical trunk line */}
          <div
            className="absolute top-0 -left-0.5 rounded-full"
            style={{
              width: "2px",
              height: `calc(100% - 1.5rem)`,
              background: isFailed
                ? "rgba(239,68,68,0.25)"
                : `${accent}30`,
            }}
          />

          {node.children.map((child, i) => (
            <div key={i} className="relative pl-5">
              {/* Horizontal branch */}
              <div
                className="absolute left-0 top-5 rounded-full"
                style={{
                  width: "1.25rem",
                  height: "2px",
                  background: child.status === "failed"
                    ? "rgba(239,68,68,0.35)"
                    : `${accent}30`,
                }}
              />
              <VisualNode
                node={child}
                depth={depth + 1}
                isLast={i === node.children.length - 1}
                maxCU={maxCU}
                index={index + i + 1}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function computeMaxCU(nodes: CallNode[]): number {
  let max = 0;
  function walk(n: CallNode) {
    if (n.computeUnits) max = Math.max(max, n.computeUnits);
    n.children.forEach(walk);
  }
  nodes.forEach(walk);
  return max;
}

function countAll(nodes: CallNode[]): number {
  return nodes.reduce((acc, n) => acc + 1 + totalDescendants(n), 0);
}

export function CallTreeVisual({ trace }: { trace: CallNode[] }) {
  if (trace.length === 0) {
    return (
      <div className="rounded-xl border border-[#1E2632] bg-[#0D1117] px-5 py-8 text-center">
        <p className="text-sm text-[#6B8299]">No call trace available.</p>
      </div>
    );
  }

  const maxCU = computeMaxCU(trace);
  const totalCalls = countAll(trace);

  return (
    <div className="rounded-xl border border-[#1E2632] bg-[#080B14] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[#131920]">
        <span className="text-[13px] font-bold uppercase tracking-widest text-[#9AAFC2]">
          Visual Tree
        </span>
        <span className="rounded bg-[#1B2433] px-1.5 py-0.5 text-xs font-semibold text-[#9AAFC2]">
          {totalCalls} call{totalCalls !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Legend */}
          {[
            { color: "#3B82F6", label: "DEX" },
            { color: "#F5A623", label: "Token" },
            { color: "#64748B", label: "System" },
            { color: "#EF4444", label: "Failed" },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1 text-[11px] text-[#6B8299]">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Tree */}
      <div className="p-5 space-y-3 overflow-x-auto">
        {trace.map((node, i) => (
          <VisualNode
            key={i}
            node={node}
            depth={0}
            isLast={i === trace.length - 1}
            maxCU={maxCU}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
