export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss97eT";
export const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

const TOKEN_IX_NAMES: Record<number, string> = {
  0: "InitializeMint",
  1: "InitializeAccount",
  2: "InitializeMultisig",
  3: "Transfer",
  4: "Approve",
  5: "Revoke",
  6: "SetAuthority",
  7: "MintTo",
  8: "Burn",
  9: "CloseAccount",
  10: "FreezeAccount",
  11: "ThawAccount",
  12: "TransferChecked",
  13: "ApproveChecked",
  14: "MintToChecked",
  15: "BurnChecked",
  16: "InitializeAccount2",
  17: "SyncNative",
  18: "InitializeAccount3",
  19: "InitializeMultisig2",
  20: "InitializeMint2",
  21: "GetAccountDataSize",
  22: "InitializeImmutableOwner",
  23: "AmountToUiAmount",
  24: "UiAmountToAmount",
};

export function decodeTokenInstruction(
  data: Buffer,
  accountKeys: string[]
): { name: string; args: Record<string, unknown> } | null {
  try {
    const ixType = data[0];
    const name = TOKEN_IX_NAMES[ixType] ?? `Unknown(${ixType})`;

    if (ixType === 3) {
      // Transfer: [type:u8][amount:u64]
      const amount = data.readBigUInt64LE(1);
      return {
        name,
        args: {
          source: accountKeys[0] ?? "unknown",
          destination: accountKeys[1] ?? "unknown",
          authority: accountKeys[2] ?? "unknown",
          amount: amount.toString(),
        },
      };
    }

    if (ixType === 12) {
      // TransferChecked: [type:u8][amount:u64][decimals:u8]
      const amount = data.readBigUInt64LE(1);
      const decimals = data[9];
      return {
        name,
        args: {
          source: accountKeys[0] ?? "unknown",
          mint: accountKeys[1] ?? "unknown",
          destination: accountKeys[2] ?? "unknown",
          authority: accountKeys[3] ?? "unknown",
          amount: amount.toString(),
          decimals,
        },
      };
    }

    if (ixType === 7) {
      // MintTo: [type:u8][amount:u64]
      const amount = data.readBigUInt64LE(1);
      return {
        name,
        args: {
          mint: accountKeys[0] ?? "unknown",
          destination: accountKeys[1] ?? "unknown",
          authority: accountKeys[2] ?? "unknown",
          amount: amount.toString(),
        },
      };
    }

    if (ixType === 8 || ixType === 15) {
      // Burn / BurnChecked
      const amount = data.readBigUInt64LE(1);
      return {
        name,
        args: {
          source: accountKeys[0] ?? "unknown",
          mint: accountKeys[1] ?? "unknown",
          authority: accountKeys[2] ?? "unknown",
          amount: amount.toString(),
        },
      };
    }

    return { name, args: {} };
  } catch {
    return null;
  }
}
