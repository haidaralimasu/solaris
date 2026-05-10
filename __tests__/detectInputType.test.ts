import { detectInputType } from "@/lib/solana";

const VALID_SIG =
  "5dPcV7GqkqyB7jNLzTBNJCpEfhX1RuBgXrNQ4p3YAfzDhS3kKFGtMzV9Wmo3HsLcV7XqBcS4s9WzN3HrBvVYqNz";

const VALID_B64 = Buffer.from("hello world this is a transaction payload that is long enough").toString("base64");

describe("detectInputType", () => {
  it("identifies a valid signature", () => {
    expect(detectInputType(VALID_SIG)).toBe("signature");
  });

  it("trims whitespace before detection", () => {
    expect(detectInputType(`  ${VALID_SIG}  `)).toBe("signature");
  });

  it("identifies base64 encoded data", () => {
    expect(detectInputType(VALID_B64)).toBe("base64");
  });

  it("returns invalid for garbage input", () => {
    expect(detectInputType("not-valid!!!")).toBe("invalid");
  });

  it("returns invalid for empty string", () => {
    expect(detectInputType("")).toBe("invalid");
  });
});
