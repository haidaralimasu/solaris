# Solaris — Tenderly for Solana

The developer operations platform Solana has been missing. Visual transaction debugger, simulator, on-chain program analytics, real-time alerts, circuit-breaker kill switch, wallet tracker, and CU profiler.

**Live:** https://solaris-self.vercel.app

---

## Features

| Feature | Route | Description |
|---------|-------|-------------|
| Transaction Debugger | `/debug` | Paste any mainnet/devnet signature → full visual CPI call tree, account diffs, failing instruction highlighted |
| Transaction Simulator | `/simulate` | Build + simulate before hitting the chain. Manual mode or Anchor IDL mode |
| Program Inspector | `/inspect` | Analytics dashboard for any on-chain program — success rate, CU stats, top callers, tx history |
| Circuit Breaker | `/circuit-breaker` | Pre-configure emergency on-chain instructions. One-click wallet-signed execution |
| Alerts | `/alerts` | Monitor programs for any activity, instruction discriminator match, errors, or large SOL transfers |
| Wallet Tracker | `/wallet` | SOL balance, SPL token holdings, tx history with lamport deltas and fee analytics |
| CU Profiler | Tab in Debugger/Simulator | Per-program compute unit breakdown with efficiency color-coding |

## Stack

- **Next.js 16** — App Router, Server Components
- **Tailwind CSS v4** — Custom dark terminal design system
- **TypeScript** — End-to-end type safety
- **Helius RPC** — Transaction simulation and on-chain data (mainnet + devnet)
- **@solana/wallet-adapter-react** — Phantom, Solflare, Coinbase, Ledger
- **NextAuth v5** — GitHub and Google OAuth
- **Vercel** — Hosting and serverless functions

## Running Locally

```bash
cp .env.example .env.local
# Fill HELIUS_API_KEY, NEXTAUTH_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
yarn install
yarn dev
```

Open http://localhost:3000

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HELIUS_API_KEY` | Yes | Helius RPC API key |
| `NEXTAUTH_SECRET` | Yes | Random secret for NextAuth sessions |
| `NEXTAUTH_URL` | Yes | Base URL |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth app client secret |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret |
