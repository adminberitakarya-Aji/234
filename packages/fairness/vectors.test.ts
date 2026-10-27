import { describe, it, expect } from "vitest";
import { hmacSha256, hmacToRollFloat, hmacToMultiplier } from "./src/hmac";
import vectors from "./vectors.json";

interface Vector {
  name: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  cursor?: number;
  expectedRoll?: number;
  expectedMultiplier?: number;
  expectedHmac: string;
}

describe("frozen test vectors (provably fair reference)", () => {
  for (const v of vectors.vectors as Vector[]) {
    it(`verifies ${v.name}`, () => {
      const key = Buffer.from(v.serverSeed, "hex");
      const message = Buffer.from(
        `${v.clientSeed}:${v.nonce}:${v.cursor ?? 0}`,
        "utf8"
      );
      const hmac = hmacSha256(key, message);
      expect(hmac.toString("hex")).toBe(v.expectedHmac);

      if (v.expectedRoll !== undefined) {
        const roll = hmacToRollFloat(hmac);
        expect(roll).toBeCloseTo(v.expectedRoll, 6);
      }
      if (v.expectedMultiplier !== undefined) {
        const multiplier = hmacToMultiplier(hmac);
        expect(multiplier).toBeCloseTo(v.expectedMultiplier, 6);
      }
    });
  }
});
