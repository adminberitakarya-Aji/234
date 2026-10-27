import { randomBytes } from "crypto";
import { sha256 } from "./hmac";

export interface SeedCommitment {
  serverSeed: string; // hex, revealed only after session ends
  serverSeedHash: string; // hex, shown to player before betting
  clientSeed: string; // hex, chosen by player
  nonce: number;
}

export interface SeedPair {
  serverSeed: string;
  clientSeed: string;
}

/**
 * Generate a new random server seed (32 bytes hex).
 */
export function generateServerSeed(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Compute SHA-256 hash of server seed for commitment.
 */
export function computeServerSeedHash(serverSeed: string): string {
  return sha256(Buffer.from(serverSeed, "hex")).toString("hex");
}

/**
 * Create a new seed commitment for a betting session.
 */
export function createSeedCommitment(clientSeed?: string): SeedCommitment {
  const serverSeed = generateServerSeed();
  return {
    serverSeed,
    serverSeedHash: computeServerSeedHash(serverSeed),
    clientSeed: clientSeed ?? randomBytes(16).toString("hex"),
    nonce: 0,
  };
}

/**
 * Increment nonce and return the next value.
 */
export function nextNonce(current: number): number {
  return current + 1;
}

/**
 * Verify that a server seed matches its commitment hash.
 */
export function verifySeedCommitment(serverSeed: string, expectedHash: string): boolean {
  const actualHash = computeServerSeedHash(serverSeed);
  return actualHash === expectedHash;
}