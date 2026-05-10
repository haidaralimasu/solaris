// Pull the human-readable message out of Anchor logs, e.g.:
// "Program log: AnchorError occurred. Error Code: SlippageToleranceExceeded. Error Message: Slippage tolerance exceeded."
export function extractLogError(logs: string[]): string | null {
  for (const line of logs) {
    const anchorMsg = line.match(/Error Message:\s*(.+?)\.?\s*$/);
    if (anchorMsg) return anchorMsg[1].replace(/\.$/, "").trim();
    const logErr = line.match(/^Program log: (?:Error|error):\s*(.+)/);
    if (logErr) return logErr[1].trim();
  }
  return null;
}

// Parse the InstructionError index from the raw error JSON
export function parseFailedInstructionIndex(rawError: string): number | null {
  try {
    const parsed = JSON.parse(rawError);
    if (Array.isArray(parsed?.InstructionError)) {
      const idx = parsed.InstructionError[0];
      return typeof idx === "number" ? idx : null;
    }
  } catch {}
  return null;
}

// Map common error patterns to actionable tips
export function getErrorTip(plainEnglish: string, rawError: string): string | null {
  const lower = plainEnglish.toLowerCase() + rawError.toLowerCase();
  if (lower.includes("slippage")) return "Price moved beyond your slippage tolerance during execution. Try increasing slippage to 1–2% or retry in calmer market conditions.";
  if (lower.includes("insufficient sol") || lower.includes("insufficient lamports") || lower.includes("insufficient funds")) return "Not enough SOL to cover fees and rent. Top up this wallet.";
  if (lower.includes("compute budget") || lower.includes("0xbbbb") || lower.includes("computationalbudgetexceeded")) return "The transaction ran out of compute units. Add a SetComputeUnitLimit instruction with a higher budget.";
  if (lower.includes("fee payer") || lower.includes("invalidaccountforfee")) return "The fee payer account is unfunded or doesn't exist on this network.";
  if (lower.includes("already in use") || lower.includes("already initialized")) return "An account this transaction tries to create already exists.";
  if (lower.includes("account not initialized") || lower.includes("0x65")) return "A required account hasn't been initialized yet — an initialization instruction may need to run first.";
  return null;
}

// Anchor framework error codes (100-999) + common protocol errors
const ANCHOR_ERRORS: Record<number, string> = {
  100: "Instruction is missing",
  101: "Instruction fallback not found",
  102: "Instruction did not deserialize",
  103: "Instruction did not serialize",
  104: "Namespace cannot be empty",
  105: "No method found",
  106: "Account discriminator already set",
  107: "Account discriminator not found",
  108: "Account discriminator did not match",
  109: "Account not initialized",
  110: "Account owned by wrong program",
  111: "Account not mutable",
  112: "Account not signer",
  113: "Account not system owned",
  114: "Account not rent exempt",
  115: "Account not associated token account",
  116: "Account not token account",
  117: "Invalid program ID",
  118: "Invalid program key",
  119: "Invalid seeds",
  120: "Constraint seeds violation",
  121: "Constraint executable",
  122: "Constraint rent exempt",
  123: "Constraint signer",
  124: "Constraint raw signer",
  125: "Constraint owner",
  126: "Constraint address",
  127: "Constraint associated",
  128: "Constraint token mint",
  129: "Constraint token owner",
  130: "Constraint token associated",
  131: "Constraint mint mint authority",
  132: "Constraint mint freeze authority",
  133: "Constraint mint decimals",
  134: "Constraint space",
  135: "Require violation",
  136: "Require eq violation",
  137: "Require keys eq violation",
  138: "Require keys neq violation",
  139: "Require neq violation",
  140: "Require gt violation",
  141: "Require gte violation",
  2000: "Account not initialized",
  2001: "Account already initialized",
  2002: "The program expected this account to be already initialized",
  2003: "The given account is not owned by the executing program",
  2004: "Failed to serialize the account",
  2005: "Failed to deserialize the account",
  2006: "Invalid program ID given to create_program_address",
  3000: "ID/address constraint was violated",
  3001: "A seeds constraint was violated",
  3002: "A raw seeds constraint was violated",
  3003: "A has_one constraint was violated",
  3004: "A signer constraint was violated",
  3005: "A raw signer constraint was violated",
  3006: "A mut constraint was violated",
  3007: "A has_one constraint was violated for key",
  3008: "An associated constraint was violated",
  3009: "An associated_token constraint was violated",
  3010: "An init constraint was violated",
  3011: "A zero_copy constraint was violated",
  3012: "A token constraint was violated",
  3013: "A mint constraint was violated",
  3014: "A close constraint was violated",
  3015: "An address constraint was violated",
  3016: "An executable constraint was violated",
  3017: "A state constraint was violated",
  3018: "A rent_exempt constraint was violated",
  3019: "A zero constraint was violated",
  3020: "A space constraint was violated",
};

export function translateError(rawError: string | null | undefined): string {
  if (!rawError) return "Unknown error";

  // Match "custom program error: 0xHHHH"
  const hexMatch = rawError.match(/custom program error:\s*0x([0-9a-fA-F]+)/i);
  if (hexMatch) {
    const code = parseInt(hexMatch[1], 16);
    const known = ANCHOR_ERRORS[code];
    if (known) return known;
    return `Custom program error 0x${hexMatch[1]} (protocol-specific — check program source)`;
  }

  // Match "Error Code: SomeError"
  const codeMatch = rawError.match(/Error Code:\s*(\w+)/);
  if (codeMatch) return codeMatch[1];

  // Compute budget exceeded
  if (rawError.includes("ComputationalBudgetExceeded") || rawError.includes("exceeded CUs meter")) {
    return "Compute budget exceeded — transaction used more compute units than allocated";
  }

  // Insufficient funds
  if (rawError.includes("insufficient lamports") || rawError.includes("insufficient funds")) {
    return "Insufficient SOL balance to pay for this transaction";
  }

  // Invalid fee payer
  if (rawError.includes("InvalidAccountForFee")) {
    return "Fee payer account not found or has no SOL — use a real funded wallet address on this network";
  }

  return rawError;
}
