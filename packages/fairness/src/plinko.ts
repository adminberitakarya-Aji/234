import type { GameResult } from "@bet/shared-types";
import { hmacSha256, hmacToRoll } from "./hmac";
import type { SeedCommitment } from "./seed";

export interface PlinkoBetParams {
  rows: number; // 8 to 16
  risk: "low" | "medium" | "high";
  amount: bigint;
  houseEdge: number;
}

export interface PlinkoResult extends GameResult {
  rows: number;
  risk: "low" | "medium" | "high";
  slot: number; // 0 to rows
}

export function computePlinkoResult(
  commitment: SeedCommitment,
  nonce: number,
  params: PlinkoBetParams
): PlinkoResult {
  const message = Buffer.from(
    `${commitment.clientSeed}:${nonce}`,
    "utf8"
  );
  const key = Buffer.from(commitment.serverSeed, "hex");
  const hmac = hmacSha256(key, message);
  const roll = hmacToRoll(hmac);

  // Slot determined by roll: 0 to rows
  const slot = Math.floor((roll / 100) * (params.rows + 1));
  const clampedSlot = Math.min(slot, params.rows);

  // Multiplier based on slot and risk (simplified)
  const baseMultiplier = 1 + (clampedSlot / params.rows) * 9;
  const riskMultiplier =
    params.risk === "low" ? 0.5 : params.risk === "medium" ? 1.0 : 2.0;
  const multiplier = baseMultiplier * riskMultiplier;

  const won = multiplier > 1;
  const payout = won ? BigInt(Math.floor(Number(params.amount) * multiplier)) : BigInt(0);

  return {
    gameType: "plinko" as const,
    roll,
    won,
    payout,
    multiplier,
    rows: params.rows,
    risk: params.risk,
    slot: clampedSlot,
  };
}