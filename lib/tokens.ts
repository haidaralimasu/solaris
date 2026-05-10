// Top Solana tokens by mint address → { symbol, name }
export const TOKEN_SYMBOLS: Record<string, { symbol: string; name: string }> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: { symbol: "USDC", name: "USD Coin" },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: { symbol: "USDT", name: "Tether USD" },
  So11111111111111111111111111111111111111112: { symbol: "WSOL", name: "Wrapped SOL" },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: { symbol: "BONK", name: "Bonk" },
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: { symbol: "JUP", name: "Jupiter" },
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": { symbol: "RAY", name: "Raydium" },
  orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE: { symbol: "ORCA", name: "Orca" },
  EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm: { symbol: "WIF", name: "dogwifhat" },
  HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3: { symbol: "PYTH", name: "Pyth Network" },
  jtojtomepa8b1kHbVQxbDjza5CPgGSt2Zede5VKiKdCj: { symbol: "JTO", name: "Jito" },
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: { symbol: "MSOL", name: "Marinade SOL" },
  "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj": { symbol: "stSOL", name: "Lido Staked SOL" },
  MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey: { symbol: "MNDE", name: "Marinade" },
  "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU": { symbol: "SAMO", name: "Samoyedcoin" },
  "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr": { symbol: "POPCAT", name: "Popcat" },
  A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ2ZCtuEk: { symbol: "USDCet", name: "USD Coin (Portal)" },
  "9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E": { symbol: "BTC", name: "Wrapped BTC (Portal)" },
  "2FPyTwcZLUgFDRDuuFxJwXFSw2YyxNkgfPqBKBkXMPpm": { symbol: "ETH", name: "Wrapped ETH (Portal)" },
  kinXdEcpDQeHPEuQnqmUgtYykqKCSVreKSjTKDkxWnRX: { symbol: "KIN", name: "KIN" },
  SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y: { symbol: "SHDW", name: "Shadow Token" },
  bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1: { symbol: "bSOL", name: "BlazeStake SOL" },
  LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzxLxv988vmUM: { symbol: "LST", name: "Liquid Staking Token" },
};

export function getTokenSymbol(mint: string): string | null {
  return TOKEN_SYMBOLS[mint]?.symbol ?? null;
}
