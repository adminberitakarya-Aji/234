import type { GameResult } from "@bet/shared-types";
import { hmacSha256, hmacToMultiplier } from "./hmac";
import type { SeedCommitment } from "./seed";

export interface CrashBetParams {
  cashoutMultiplier: number; // player's target cashout
  amount: bigint;
  houseEdge: number; // basis points
}

export interface CrashResult extends GameResult {
  crashMultiplier: number;
  cashoutMultiplier: number;
}

export function computeCrashResult(
  commitment: SeedCommitment,
  nonce: number,
  params: CrashBetParams
): CrashResult {
  const message = Buffer.from(
    `${commitment.clientSeed}:${nonce}`,
    "utf8"
  );
  const key = Buffer.from(commitment.serverSeed, "hex");
  const hmac = hmacSha256(key, message);
  const crashMultiplier = hmacToMultiplier(hmac);

  const won = crashMultiplier >= params.cashoutMultiplier;
  const multiplier = won ? params.cashoutMultiplier : 0;
  const payout = won ? BigInt(Math.floor(Number(params.amount) * multiplier)) : BigInt(0);

  return {
    gameType: "crash" as const,
    roll: crashMultiplier * 100, // store as basis points for compatibility
    won,
    payout,
    multiplier,
    crashMultiplier,
    cashoutMultiplier: params.cashoutMultiplier,
  };
}