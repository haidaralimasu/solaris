export const ATA_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe5d";

export function decodeATAInstruction(
  data: Buffer,
  accountKeys: string[]
): { name: string; args: Record<string, unknown> } | null {
  try {
    // ATA program has 2 instructions: Create (0 or no discriminator) and CreateIdempotent (1)
    const ixType = data.length > 0 ? data[0] : 0;
    const name = ixType === 1 ? "CreateIdempotent" : "Create";
    return {
      name,
      args: {
        payer: accountKeys[0] ?? "unknown",
        associatedAccount: accountKeys[1] ?? "unknown",
        owner: accountKeys[2] ?? "unknown",
        mint: accountKeys[3] ?? "unknown",
      },
    };
  } catch {
    return null;
  }
}
