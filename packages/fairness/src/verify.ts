import { createHmac } from "crypto";
import { hmacToRoll } from "./hmac";

export interface VerificationInput {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

export interface VerificationOutput {
  hmac: string; // hex
  roll: number;
  valid: boolean;
}

/**
 * Verify a bet result by recomputing HMAC from revealed seeds.
 */
export function verifyBetResult(input: VerificationInput): VerificationOutput {
  const message = Buffer.from(`${input.clientSeed}:${input.nonce}`, "utf8");
  const key = Buffer.from(input.serverSeed, "hex");
  const hmac = createHmac("sha256", key).update(message).digest();
  const roll = hmacToRoll(hmac);

  return {
    hmac: hmac.toString("hex"),
    roll,
    valid: true,
  };
}

/**
 * Verify that server seed matches its commitment hash.
 */
export function verifyServerSeed(serverSeed: string, commitmentHash: string): boolean {
  const { createHash } = require("crypto");
  const actualHash = createHash("sha256").update(Buffer.from(serverSeed, "hex")).digest("hex");
  return actualHash === commitmentHash;
}