"use client";

import { useState } from "react";
import type { Network, SimulateRequest } from "@/types/simulate";

interface SimulatorFormProps {
  onSubmit: (req: SimulateRequest) => void;
  loading: boolean;
}

export function SimulatorForm({ onSubmit, loading }: SimulatorFormProps) {
  const [input, setInput] = useState("");
  const [network, setNetwork] = useState<Network>("mainnet-beta");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSubmit({ input: trimmed, network });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Transaction signature or base64 payload
        </label>
        <textarea
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          rows={3}
          placeholder="5dPcV7… or base64 transaction"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Network
        </label>
        <select
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          value={network}
          onChange={(e) => setNetwork(e.target.value as Network)}
          disabled={loading}
        >
          <option value="mainnet-beta">Mainnet Beta</option>
          <option value="devnet">Devnet</option>
        </select>

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="ml-auto rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Simulating…" : "Simulate"}
        </button>
      </div>
    </form>
  );
}
