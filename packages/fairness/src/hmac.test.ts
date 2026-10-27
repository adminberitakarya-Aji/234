import { describe, it, expect } from "vitest";
import { hmacSha256, hmacToRoll, hmacToRollFloat, hmacToMultiplier, secureCompare } from "./hmac";

describe("HMAC-SHA256", () => {
  it("produces deterministic output for same inputs", () => {
    const key = Buffer.from("test_key", "utf8");
    const message = Buffer.from("test_message", "utf8");
    const result1 = hmacSha256(key, message);
    const result2 = hmacSha256(key, message);
    expect(result1.equals(result2)).toBe(true);
  });

  it("produces different output for different keys", () => {
    const message = Buffer.from("test_message", "utf8");
    const result1 = hmacSha256(Buffer.from("key1", "utf8"), message);
    const result2 = hmacSha256(Buffer.from("key2", "utf8"), message);
    expect(result1.equals(result2)).toBe(false);
  });

  it("hmacToRoll returns value in range [0, 99.99]", () => {
    const hmac = Buffer.alloc(32, 0xff);
    const roll = hmacToRoll(hmac);
    expect(roll).toBeGreaterThanOrEqual(0);
    expect(roll).toBeLessThanOrEqual(99.99);
  });

  it("hmacToMultiplier returns value in range [1.00, 1000.00]", () => {
    const hmac = Buffer.alloc(32, 0xff);
    const mult = hmacToMultiplier(hmac);
    expect(mult).toBeGreaterThanOrEqual(1);
    expect(mult).toBeLessThanOrEqual(1000);
  });

  it("secureCompare works for equal buffers", () => {
    const a = Buffer.from("hello");
    const b = Buffer.from("hello");
    expect(secureCompare(a, b)).toBe(true);
  });

  it("secureCompare returns false for different lengths", () => {
    const a = Buffer.from("hello");
    const b = Buffer.from("helloo");
    expect(secureCompare(a, b)).toBe(false);
  });

  it("hmacToRollFloat returns value in range [0, 100] without modulo", () => {
    const hmac = Buffer.alloc(32, 0xff);
    const roll = hmacToRollFloat(hmac);
    expect(roll).toBeGreaterThanOrEqual(0);
    expect(roll).toBeLessThanOrEqual(100);
  });

  it("hmacToRollFloat avoids modulo bias (all-ff maps to 100, not capped at 99.99)", () => {
    const hmac = Buffer.alloc(32, 0xff);
    expect(hmacToRoll(hmac)).toBeCloseTo(72.95, 6);
    expect(hmacToRollFloat(hmac)).toBe(100);
  });
});