import { createHmac, timingSafeEqual } from "crypto";

export const HMAC_ALGORITHM = "sha256";

/**
 * Compute HMAC-SHA256 of message using key.
 * Returns Buffer of 32 bytes.
 */
export function hmacSha256(key: Buffer, message: Buffer): Buffer {
  return createHmac(HMAC_ALGORITHM, key).update(message).digest();
}

/**
 * Compute SHA-256 hash of data.
 * Returns Buffer of 32 bytes.
 */
export function sha256(data: Buffer): Buffer {
  const { createHash } = require("crypto");
  return createHash("sha256").update(data).digest();
}

/**
 * Constant-time comparison of two buffers.
 */
export function secureCompare(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Convert first 4 bytes of HMAC output to a roll in range [0, 99.99].
 * Used by Dice, Plinko, Mines.
 */
export function hmacToRoll(hmac: Buffer): number {
  const value = hmac.readUInt32BE(0);
  return (value % 10000) / 100;
}

/**
 * Convert HMAC output to a multiplier for Crash.
 * Uses first 8 bytes to get a fair random multiplier in [1.00, 1000.00].
 */
export function hmacToMultiplier(hmac: Buffer): number {
  const value = hmac.readBigUInt64BE(0);
  const max = BigInt(100000); // 1000.00 * 100
  const min = BigInt(100); // 1.00 * 100
  const range = max - min;
  const scaled = (value % range) + min;
  return Number(scaled) / 100;
}