export const metadata = { title: "Settings — Solaris" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-[#F8FAFC]">Settings</h1>
        <p className="text-sm text-[#6B8299] mt-1">
          Configure your Solaris workspace preferences.
        </p>
      </div>

      <div className="rounded-xl p-5" style={{ background: "#0A1628", border: "1px solid #131920" }}>
        <h2 className="text-sm font-bold text-[#F8FAFC] mb-1">Default Network</h2>
        <p className="text-xs text-[#6B8299] mb-3">Used as the pre-selected network across all tools.</p>
        <div className="flex gap-2">
          {["mainnet-beta", "devnet"].map((n) => (
            <button
              key={n}
              className="rounded-lg px-4 py-2 text-xs font-semibold transition-all"
              style={
                n === "mainnet-beta"
                  ? { background: "rgba(245,166,35,0.1)", border: "1px solid rgba(245,166,35,0.3)", color: "#F5A623" }
                  : { background: "#070D17", border: "1px solid #1B2C3E", color: "#6B8299" }
              }
            >
              {n === "mainnet-beta" ? "Mainnet" : "Devnet"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-5" style={{ background: "#0A1628", border: "1px solid #131920" }}>
        <h2 className="text-sm font-bold text-[#F8FAFC] mb-1">Data & Privacy</h2>
        <p className="text-xs text-[#6B8299] mb-3">
          Simulation history and alert rules are stored locally in your browser. No data is sent to our servers beyond the RPC calls needed to fetch on-chain data.
        </p>
        <button
          className="rounded-lg px-4 py-2 text-xs font-semibold transition-all"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}
        >
          Clear Local Data
        </button>
      </div>

      <div className="rounded-xl p-5" style={{ background: "#0A1628", border: "1px solid #131920" }}>
        <h2 className="text-sm font-bold text-[#F8FAFC] mb-1">About</h2>
        <div className="text-xs text-[#6B8299] space-y-1">
          <p>Solaris — Tenderly for Solana</p>
          <p>Built for the Colosseum Hackathon · 2026</p>
          <p className="font-mono text-[#4A6478]">Stack: Next.js 16 · Tailwind v4 · Helius RPC</p>
        </div>
      </div>
    </div>
  );
}
