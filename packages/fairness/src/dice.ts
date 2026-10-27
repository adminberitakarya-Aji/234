import type { GameResult } from "@bet/shared-types";
import { hmacSha256, hmacToRollFloat } from "./hmac";
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
  params: DiceBetParams,
  cursor = 0,
): DiceResult {
  // PRD: HMAC(server_seed, client_seed:nonce:cursor), 4-byte float, no modulo.
  const message = Buffer.from(
    `${commitment.clientSeed}:${nonce}:${cursor}`,
    "utf8"
  );
  const key = Buffer.from(commitment.serverSeed, "hex");
  const hmac = hmacSha256(key, message);
  const roll = hmacToRollFloat(hmac);

  const won = roll <= params.targetRoll;
  // Payout = amount * (1 - houseEdge) / probability
  // Edge must REDUCE payout (house keeps the edge), never increase it.
  // probability = targetRoll / 100
  const probability = params.targetRoll / 100;
  const multiplier = won ? (1 - params.houseEdge / 10000) / probability : 0;
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