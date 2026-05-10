"use client";

import { useState } from "react";
import type { AccountDiff, Network } from "@/types/simulate";
import { accountUrl, tokenUrl } from "@/lib/explorer";
import { getTokenSymbol } from "@/lib/tokens";

interface AccountDiffTableProps {
  diffs: AccountDiff[];
  network: Network;
}

function shortAddr(id: string): string {
  return `${id.slice(0, 8)}…${id.slice(-6)}`;
}

function formatLamports(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(4)} SOL`;
  return `${n.toLocaleString()} lamports`;
}

function Delta({ value, formatter }: { value: number; formatter: (n: number) => string }) {
  if (value === 0) return <span className="font-mono text-xs text-[#2A3441]">—</span>;
  const positive = value > 0;
  return (
    <span className={`font-mono text-xs font-medium ${positive ? "text-emerald-400" : "text-red-400"}`}>
      {positive ? "+" : ""}
      {formatter(value)}
    </span>
  );
}

function AddrCell({ address, network, copiedKey, onCopy }: {
  address: string;
  network: Network;
  copiedKey: string | null;
  onCopy: (addr: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 group/cell">
      <a
        href={accountUrl(address, network)}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-xs text-[#94A3B8] hover:text-[#F5A623] transition-colors"
        title={address}
      >
        {shortAddr(address)}
      </a>
      <button
        onClick={() => onCopy(address)}
        className="opacity-0 group-hover/cell:opacity-100 rounded px-1 py-0.5 text-[10px] text-[#475569] hover:text-[#F0F4F8] transition-all"
      >
        {copiedKey === address ? "✓" : "⎘"}
      </button>
    </div>
  );
}

function MintCell({ mint, network, copiedKey, onCopy }: {
  mint: string;
  network: Network;
  copiedKey: string | null;
  onCopy: (addr: string) => void;
}) {
  const symbol = getTokenSymbol(mint);
  return (
    <div className="flex items-center gap-1 group/cell">
      <a
        href={tokenUrl(mint, network)}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-xs transition-colors hover:text-[#F5A623]"
        title={mint}
      >
        {symbol
          ? <span className="text-[#9AAFC2] font-semibold">{symbol}</span>
          : <span className="text-[#475569]">{shortAddr(mint)}</span>
        }
      </a>
      <button
        onClick={() => onCopy(mint)}
        className="opacity-0 group-hover/cell:opacity-100 rounded px-1 py-0.5 text-[10px] text-[#475569] hover:text-[#F0F4F8] transition-all"
      >
        {copiedKey === mint ? "✓" : "⎘"}
      </button>
    </div>
  );
}

export function AccountDiffTable({ diffs, network }: AccountDiffTableProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copyAddr(addr: string) {
    navigator.clipboard.writeText(addr).then(() => {
      setCopiedKey(addr);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  }

  const changed = diffs.filter(
    (d) => d.lamportDelta !== 0 || d.tokenDelta !== undefined
  );

  if (changed.length === 0) {
    return (
      <div className="rounded-xl border border-[#1E2632] bg-[#0D1117] px-5 py-8 text-center">
        <p className="text-sm text-[#475569]">No account state changes detected.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1E2632] bg-[#0D1117] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[#131920] px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
          State Changes
        </span>
        <span className="rounded bg-[#131920] px-1.5 py-0.5 text-[10px] text-[#475569]">
          {changed.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#131920]">
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#2A3441]">Account</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#2A3441]">SOL Δ</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#2A3441]">Token Δ</th>
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#2A3441]">Token</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#131920]">
            {changed.map((d) => (
              <tr key={d.pubkey} className="group hover:bg-white/[0.015]">
                <td className="px-5 py-3">
                  <AddrCell address={d.pubkey} network={network} copiedKey={copiedKey} onCopy={copyAddr} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Delta value={d.lamportDelta} formatter={formatLamports} />
                </td>
                <td className="px-4 py-3 text-right">
                  {d.tokenDelta !== undefined ? (
                    <Delta value={Number(d.tokenDelta)} formatter={(n) => n.toLocaleString()} />
                  ) : (
                    <span className="font-mono text-xs text-[#1E2632]">—</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {d.mint
                    ? <MintCell mint={d.mint} network={network} copiedKey={copiedKey} onCopy={copyAddr} />
                    : <span className="font-mono text-xs text-[#1E2632]">—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
