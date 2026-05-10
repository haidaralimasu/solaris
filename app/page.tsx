import Link from "next/link";

export default async function RootPage() {
  return (
    <div className="min-h-screen bg-[#03060F] text-[#F0F4F8] overflow-x-hidden">

      {/* ── Background orbs ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Amber orb top-right */}
        <div
          className="absolute animate-float-slow animate-glow-pulse"
          style={{
            top: "-15%", right: "-10%",
            width: "700px", height: "700px",
            background: "radial-gradient(circle, rgba(245,166,35,0.13) 0%, rgba(245,166,35,0.04) 50%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
        {/* Blue orb bottom-left */}
        <div
          className="absolute animate-float-mid"
          style={{
            bottom: "-20%", left: "-15%",
            width: "800px", height: "800px",
            background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.03) 50%, transparent 70%)",
            borderRadius: "50%",
            animationDelay: "2s",
          }}
        />
        {/* Center subtle glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "1000px", height: "400px",
            background: "radial-gradient(ellipse, rgba(245,166,35,0.04) 0%, transparent 65%)",
          }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.022]"
          style={{
            backgroundImage: "radial-gradient(circle, #F5A623 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#F5A623] flex items-center justify-center flex-shrink-0 shadow-lg" style={{boxShadow:"0 0 16px rgba(245,166,35,0.35)"}}>
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M13 2L4.09344 12.6879C3.74463 13.1064 3.57023 13.3157 3.56756 13.4925C3.56524 13.6461 3.63372 13.7923 3.75324 13.8889C3.89073 14 4.16209 14 4.70481 14H12L11 22L19.9065 11.3121C20.2553 10.8936 20.4297 10.6843 20.4324 10.5075C20.4347 10.3539 20.3663 10.2077 20.2467 10.1111C20.1092 10 19.8379 10 19.2951 10H12L13 2Z" stroke="#080B14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-[17px] font-bold tracking-tight">Solaris</span>
        </div>
        <div className="hidden sm:flex items-center gap-7 text-[14px] font-medium text-[#6B8299]">
          <Link href="/simulate" className="hover:text-[#F0F4F8] transition-colors">Simulator</Link>
          <Link href="/debug" className="hover:text-[#F0F4F8] transition-colors">Debugger</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-[14px] font-medium text-[#9AAFC2] hover:text-[#F0F4F8] transition-colors hidden sm:block">
            Sign in
          </Link>
          <Link href="/simulate" className="btn-shimmer rounded-lg bg-[#F5A623] px-5 py-2 text-[13px] font-bold text-[#03060F] transition-all hover:bg-[#F5A623]/90" style={{boxShadow:"0 0 20px rgba(245,166,35,0.25)"}}>
            Launch App →
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-16 pb-8 text-center">
        {/* Badge */}
        <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-[#F5A623]/20 bg-[#F5A623]/5 px-5 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F5A623]" style={{boxShadow:"0 0 6px #F5A623"}} />
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#F5A623]">
            Tenderly for Solana — Built for Devs
          </span>
        </div>

        <h1 className="mb-6 text-[56px] sm:text-[72px] font-bold leading-[1.0] tracking-tight">
          <span className="text-[#F0F4F8]">Debug Solana</span>
          <br />
          <span style={{
            background: "linear-gradient(135deg, #F5A623 0%, #FFD97D 40%, #F5A623 70%, #E8870A 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            before it breaks.
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-xl text-[17px] leading-relaxed text-[#7A93AB]">
          Replay any transaction against live chain state. See the full CPI
          call tree, every account mutation, every compute unit — and the
          exact instruction where it failed.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <Link
            href="/simulate"
            className="btn-shimmer flex items-center gap-2.5 rounded-xl px-9 py-4 text-[15px] font-bold text-[#03060F] transition-all hover:scale-[1.03]"
            style={{background:"linear-gradient(135deg, #F5A623, #E8870A)", boxShadow:"0 0 40px rgba(245,166,35,0.3), 0 4px 20px rgba(245,166,35,0.2)"}}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z"/>
            </svg>
            Start Simulating
          </Link>
          <Link
            href="/debug"
            className="flex items-center gap-2 rounded-xl border border-[#1A2535] bg-[#070D17]/80 px-9 py-4 text-[15px] font-semibold text-[#9AAFC2] transition-all hover:border-[#F5A623]/25 hover:text-[#F0F4F8] hover:bg-[#0C1420]"
          >
            Debug a Transaction
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 opacity-60">
              <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd"/>
            </svg>
          </Link>
        </div>

        <p className="text-[13px] text-[#475569]">Free · No wallet required · Mainnet &amp; Devnet</p>
      </section>

      {/* ── Terminal preview ── */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-20">
        <div
          className="rounded-2xl border border-[#111D2E] overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #070D17 0%, #040810 100%)",
            boxShadow: "0 0 0 1px rgba(245,166,35,0.06), 0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(245,166,35,0.04)",
          }}
        >
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#0E1925] bg-[#040810]">
            <div className="h-3 w-3 rounded-full bg-[#EF4444]/50" />
            <div className="h-3 w-3 rounded-full bg-[#F5A623]/50" />
            <div className="h-3 w-3 rounded-full bg-[#22C55E]/50" />
            <div className="flex-1 mx-4">
              <div className="mx-auto w-64 rounded bg-[#0A1220] px-3 py-1 text-center font-mono text-[11px] text-[#475569]">
                solaris — Jupiter multi-hop swap
              </div>
            </div>
          </div>

          {/* Call tree */}
          <div className="p-5 space-y-3 font-mono text-[12px]">
            {/* Root */}
            <div className="rounded-xl border border-[#3B82F6]/20 bg-[#040C18] overflow-hidden" style={{boxShadow:"0 0 20px rgba(59,130,246,0.06)"}}>
              <div className="flex items-center gap-3 px-4 py-3 border-l-[3px] border-[#3B82F6]">
                <span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" style={{boxShadow:"0 0 6px #22C55E"}} />
                <span className="font-bold text-[#F0F4F8]">JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4</span>
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 ml-1">Jupiter v6</span>
                <div className="flex-1" />
                <span className="text-[#475569]">142,847 CU</span>
                <span className="text-[#6B8299]">▾ 3 sub</span>
              </div>
              <div className="px-4 pb-2">
                <div className="h-1 w-full rounded-full bg-[#0E1925]">
                  <div className="h-full rounded-full w-[10%]" style={{background:"linear-gradient(90deg, #3B82F699, #3B82F6)"}} />
                </div>
              </div>
            </div>

            {/* Children */}
            <div className="ml-6 space-y-2 relative">
              <div className="absolute top-0 -left-1 w-px rounded-full" style={{height:"calc(100% - 1.5rem)", background:"rgba(59,130,246,0.2)"}} />
              {[
                { addr:"whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3sFKDcc", label:"Orca Whirlpool", color:"#14B8A6", cu:"89,204", pct:"6%" },
                { addr:"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", label:"Token Program", color:"#F5A623", cu:"6,241", pct:"0.4%" },
                { addr:"675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", label:"Raydium AMM", color:"#A855F7", cu:"52,180", pct:"3.7%", failed: false },
              ].map((n, i) => (
                <div key={i} className="relative pl-5">
                  <div className="absolute left-0 top-5 rounded-full" style={{width:"1.25rem",height:"2px",background:`${n.color}30`}} />
                  <div className="rounded-xl border overflow-hidden" style={{borderColor:`${n.color}18`, background:"#040810"}}>
                    <div className="flex items-center gap-3 px-4 py-2.5 border-l-[3px]" style={{borderColor:n.color}}>
                      <span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span className="text-[#C5D3DF] truncate max-w-[280px]">{n.addr}</span>
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-bold flex-shrink-0" style={{background:`${n.color}12`,color:n.color,border:`1px solid ${n.color}25`}}>{n.label}</span>
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-[#0E1925] text-[#6B8299]">CPI 1</span>
                      <div className="flex-1" />
                      <span className="text-[#475569] flex-shrink-0">{n.cu} CU</span>
                    </div>
                    <div className="px-4 pb-2">
                      <div className="h-0.5 w-full rounded-full bg-[#0E1925]">
                        <div className="h-full rounded-full" style={{width:n.pct,background:`linear-gradient(90deg, ${n.color}80, ${n.color})`}} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-[#0E1925]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" style={{boxShadow:"0 0 6px #22C55E"}} />
              <span className="text-emerald-400 font-semibold">Transaction succeeded</span>
              <span className="text-[#475569]">·</span>
              <span className="text-[#6B8299]">4 programs · 290,472 / 1,400,000 CU (20.7%)</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: "50+", label: "Programs Decoded" },
            { value: "5", label: "Result Views" },
            { value: "<2s", label: "Avg Replay Time" },
            { value: "Free", label: "Always" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-[#111D2E] bg-[#070D17] p-6 text-center transition-all hover:border-[#F5A623]/15"
            >
              <p className="text-3xl font-bold text-[#F0F4F8] mb-1" style={{
                background:"linear-gradient(135deg,#F5A623,#FFD97D)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text"
              }}>{s.value}</p>
              <p className="text-[13px] text-[#6B8299]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <div className="mb-14 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-[#F5A623]/70">
            Core Features
          </p>
          <h2 className="text-4xl font-bold tracking-tight text-[#F0F4F8]">
            Everything you need to ship
            <br />
            <span className="text-[#6B8299]">faster on Solana.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[
            {
              num: "01",
              color: "#3B82F6",
              title: "Visual Call Tree",
              body: "Every CPI invocation rendered as an interactive tree. Color-coded by protocol — Jupiter, Orca, Raydium, Token, System and 40+ more.",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                </svg>
              ),
            },
            {
              num: "02",
              color: "#F5A623",
              title: "Transaction Debugger",
              body: "Paste any mainnet signature. Solaris replays it against exact chain state and surfaces the failing instruction with its full error.",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z" />
                </svg>
              ),
            },
            {
              num: "03",
              color: "#22C55E",
              title: "IDL Simulator",
              body: "Paste your Anchor IDL and auto-generate instruction fields. Fill in accounts and args, simulate before the transaction ever hits the chain.",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                </svg>
              ),
            },
          ].map((f) => (
            <div
              key={f.num}
              className="card-corner group relative rounded-2xl border border-[#111D2E] bg-[#070D17] p-7 transition-all duration-300 hover:border-[#1A2D42] hover:-translate-y-1"
              style={{"--tw-shadow": `0 0 40px ${f.color}08`} as React.CSSProperties}
            >
              {/* Number */}
              <p className="mb-5 font-mono text-[11px] font-bold tracking-widest" style={{color:`${f.color}60`}}>{f.num}</p>
              {/* Icon */}
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl transition-all group-hover:scale-110" style={{background:`${f.color}12`, color:f.color, boxShadow:`0 0 20px ${f.color}15`}}>
                {f.icon}
              </div>
              <h3 className="mb-2.5 text-[16px] font-bold text-[#F0F4F8]">{f.title}</h3>
              <p className="text-[14px] leading-relaxed text-[#7A93AB]">{f.body}</p>
              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-7 right-7 h-px opacity-0 group-hover:opacity-100 transition-opacity" style={{background:`linear-gradient(90deg, transparent, ${f.color}40, transparent)`}} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Supported protocols ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <p className="mb-7 text-center text-[11px] font-bold uppercase tracking-[0.15em] text-[#475569]">
          Recognises & decodes
        </p>
        <div className="overflow-hidden">
          <div className="flex gap-3 animate-marquee whitespace-nowrap" style={{width:"max-content"}}>
            {[
              { name: "Jupiter", color: "#3B82F6" },
              { name: "Orca Whirlpool", color: "#14B8A6" },
              { name: "Raydium AMM", color: "#A855F7" },
              { name: "Raydium CLMM", color: "#C084FC" },
              { name: "Token Program", color: "#F5A623" },
              { name: "Token-2022", color: "#F59E0B" },
              { name: "System Program", color: "#64748B" },
              { name: "Meteora DLMM", color: "#8B5CF6" },
              { name: "Marinade", color: "#0EA5E9" },
              { name: "Marginfi", color: "#22C55E" },
              { name: "Drift", color: "#F97316" },
              { name: "OpenBook", color: "#F97316" },
              { name: "Wormhole", color: "#6366F1" },
              { name: "Kamino", color: "#EC4899" },
              { name: "Compute Budget", color: "#475569" },
              { name: "ATA Program", color: "#FBBF24" },
              // duplicate for seamless loop
              { name: "Jupiter", color: "#3B82F6" },
              { name: "Orca Whirlpool", color: "#14B8A6" },
              { name: "Raydium AMM", color: "#A855F7" },
              { name: "Token Program", color: "#F5A623" },
              { name: "Meteora DLMM", color: "#8B5CF6" },
              { name: "Marinade", color: "#0EA5E9" },
              { name: "Drift", color: "#F97316" },
              { name: "Wormhole", color: "#6366F1" },
            ].map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold flex-shrink-0"
                style={{borderColor:`${p.color}25`, background:`${p.color}0A`, color:p.color}}
              >
                <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{background:p.color, boxShadow:`0 0 5px ${p.color}`}} />
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-24">
        <div className="mb-14 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-[#F5A623]/70">How It Works</p>
          <h2 className="text-4xl font-bold tracking-tight text-[#F0F4F8]">Three steps to clarity.</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { n:"01", title:"Paste or Build", body:"Drop any mainnet or devnet transaction signature into the debugger — or build a fresh transaction using Manual mode or your Anchor IDL." },
            { n:"02", title:"Replay on Chain", body:"Solaris calls Helius RPC to simulate the transaction against the real on-chain state at that slot. Zero mocking. Zero guesswork." },
            { n:"03", title:"Read the Trace", body:"Every instruction is laid out as a collapsible call tree. Failed nodes erupt in red and surface the exact error. Compute units shown per call." },
          ].map((s, i) => (
            <div key={s.n} className="relative">
              {i < 2 && (
                <div className="hidden sm:block absolute top-8 right-0 w-6 text-center text-[#1A2535]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5 mx-auto">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              )}
              <div className="rounded-2xl border border-[#111D2E] bg-[#070D17] p-7 h-full">
                <span className="font-mono text-[28px] font-bold" style={{
                  background:"linear-gradient(135deg,#F5A623,#E8870A)",
                  WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text"
                }}>{s.n}</span>
                <h3 className="mt-4 mb-3 text-[16px] font-bold text-[#F0F4F8]">{s.title}</h3>
                <p className="text-[14px] leading-relaxed text-[#7A93AB]">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-28">
        <div
          className="relative rounded-3xl overflow-hidden p-12 text-center"
          style={{
            background: "linear-gradient(135deg, #0C1420 0%, #070D17 50%, #0A1018 100%)",
            border: "1px solid rgba(245,166,35,0.15)",
            boxShadow: "0 0 60px rgba(245,166,35,0.06), inset 0 1px 0 rgba(245,166,35,0.08)",
          }}
        >
          {/* Corner decorations */}
          <div className="absolute top-0 left-0 w-20 h-20 opacity-30" style={{background:"radial-gradient(circle at top left, rgba(245,166,35,0.3), transparent 70%)"}} />
          <div className="absolute bottom-0 right-0 w-20 h-20 opacity-30" style={{background:"radial-gradient(circle at bottom right, rgba(245,166,35,0.3), transparent 70%)"}} />

          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-[#F5A623]/70">Get Started</p>
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-[#F0F4F8]">
            Stop guessing.<br />Start debugging.
          </h2>
          <p className="mb-9 text-[16px] text-[#7A93AB]">
            Free to use. No wallet. No sign-up required.
          </p>
          <Link
            href="/simulate"
            className="btn-shimmer inline-flex items-center gap-2.5 rounded-xl px-12 py-4 text-[15px] font-bold text-[#03060F] transition-all hover:scale-[1.03]"
            style={{background:"linear-gradient(135deg,#F5A623,#E8870A)", boxShadow:"0 0 50px rgba(245,166,35,0.35), 0 4px 24px rgba(245,166,35,0.2)"}}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z"/>
            </svg>
            Open Solaris — it&apos;s free
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-[#0E1925] px-6 py-8">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-[#F5A623] flex items-center justify-center" style={{boxShadow:"0 0 10px rgba(245,166,35,0.25)"}}>
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                <path d="M13 2L4.09344 12.6879C3.74463 13.1064 3.57023 13.3157 3.56756 13.4925C3.56524 13.6461 3.63372 13.7923 3.75324 13.8889C3.89073 14 4.16209 14 4.70481 14H12L11 22L19.9065 11.3121C20.2553 10.8936 20.4297 10.6843 20.4324 10.5075C20.4347 10.3539 20.3663 10.2077 20.2467 10.1111C20.1092 10 19.8379 10 19.2951 10H12L13 2Z" stroke="#080B14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-[14px] font-bold text-[#9AAFC2]">Solaris</span>
          </div>
          <p className="text-[12px] text-[#374151]">
            Built for the Colesium Hackathon · Tenderly for Solana
          </p>
          <div className="flex items-center gap-5">
            {[
              { href:"/simulate", label:"Simulator" },
              { href:"/debug", label:"Debugger" },
              { href:"/sign-in", label:"Sign in" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="text-[13px] text-[#475569] hover:text-[#9AAFC2] transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
