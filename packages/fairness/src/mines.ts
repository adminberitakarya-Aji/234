import type { GameResult } from "@bet/shared-types";
import { hmacSha256, hmacToRoll } from "./hmac";
import type { SeedCommitment } from "./seed";

export interface MinesBetParams {
  mines: number; // number of bombs on 5x5 grid
  amount: bigint;
  houseEdge: number;
}

export interface MinesResult extends GameResult {
  mines: number;
  safeCells: number; // number of cells opened before hitting bomb
}

export function computeMinesResult(
  commitment: SeedCommitment,
  nonce: number,
  params: MinesBetParams
): MinesResult {
  const message = Buffer.from(
    `${commitment.clientSeed}:${nonce}`,
    "utf8"
  );
  const key = Buffer.from(commitment.serverSeed, "hex");
  const hmac = hmacSha256(key, message);
  const roll = hmacToRoll(hmac);

  // Determine where the first bomb appears based on roll
  // Higher roll = bomb appears later (more safe cells)
  const totalCells = 25;
  const bombThreshold = (params.mines / totalCells) * 100;
  const safeCells = roll > bombThreshold ? Math.floor((roll - bombThreshold) / (100 - bombThreshold) * (totalCells - params.mines)) : 0;
  const clampedSafeCells = Math.min(safeCells, totalCells - params.mines);

  const multiplier = 1 + (clampedSafeCells / (totalCells - params.mines)) * 9;
  const won = clampedSafeCells > 0;
  const payout = won ? BigInt(Math.floor(Number(params.amount) * multiplier)) : BigInt(0);

  return {
    gameType: "mines" as const,
    roll,
    won,
    payout,
    multiplier,
    mines: params.mines,
    safeCells: clampedSafeCells,
  };
}