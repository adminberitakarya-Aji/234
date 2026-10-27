import type { GameResult } from "@bet/shared-types";
import { hmacSha256, hmacToRoll } from "./hmac";
import type { SeedCommitment } from "./seed";

export interface DiceBetParams {
  targetRoll: number; // 0 to 99.99
  amount: bigint;
  houseEdge: number; // basis points
}

export interface DiceResult extends GameResult {
  targetRoll: number;
}

export function computeDiceResult(
  commitment: SeedCommitment,
  nonce: number,
  params: DiceBetParams
): DiceResult {
  const message = Buffer.from(
    `${commitment.clientSeed}:${nonce}`,
    "utf8"
  );
  const key = Buffer.from(commitment.serverSeed, "hex");
  const hmac = hmacSha256(key, message);
  const roll = hmacToRoll(hmac);

  const won = roll <= params.targetRoll;
  // Payout = amount * (1 / (probability * (1 - houseEdge)))
  // probability = targetRoll / 100
  const probability = params.targetRoll / 100;
  const effectiveProbability = probability * (1 - params.houseEdge / 10000);
  const multiplier = won ? 1 / effectiveProbability : 0;
  const payout = won ? BigInt(Math.floor(Number(params.amount) * multiplier)) : BigInt(0);

  return {
    gameType: "dice" as const,
    roll,
    won,
    payout,
    multiplier: won ? multiplier : 0,
    targetRoll: params.targetRoll,
  };
}