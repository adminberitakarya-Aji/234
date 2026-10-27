import type { GameResult } from "@bet/shared-types";
import { hmacSha256, hmacToFloat } from "./hmac";
import type { SeedCommitment } from "./seed";

export interface MinesBetParams {
  mines: number; // number of bombs on 5x5 grid (1-24)
  amount: bigint;
  houseEdge: number;
}

export interface MinesResult extends GameResult {
  mines: number;
  safeCells: number; // number of safe cells opened before hitting bomb
  bombPositions: number[]; // positions of bombs (0-24), revealed after round
  gridSize: number; // always 25 (5x5)
}

export function computeMinesResult(
  commitment: SeedCommitment,
  nonce: number,
  params: MinesBetParams
): MinesResult {
  const totalCells = 25;
  const gridSize = 5;

  // Validate mine count
  if (params.mines < 1 || params.mines > 24) {
    throw new Error("Mines count must be between 1 and 24");
  }

  // PRD: Shuffle Fisher-Yates on 25 positions using sequential floats from HMAC
  // Each position gets a float from HMAC(client_seed:nonce:cursor) for cursor = 0..24
  const floats: number[] = [];
  for (let cursor = 0; cursor < totalCells; cursor++) {
    const message = Buffer.from(
      `${commitment.clientSeed}:${nonce}:${cursor}`,
      "utf8"
    );
    const key = Buffer.from(commitment.serverSeed, "hex");
    const hmac = hmacSha256(key, message);
    floats.push(hmacToFloat(hmac));
  }

  // Fisher-Yates shuffle: create array [0..24], then shuffle using floats
  const positions: number[] = Array.from({ length: totalCells }, (_, i) => i);
  for (let i = totalCells - 1; i > 0; i--) {
    // Use float[cursor] to pick j in [0, i]
    const cursor = totalCells - 1 - i; // maps to float index
    const j = Math.floor(floats[cursor] * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  // First `mines` positions in shuffled array are bombs
  const bombPositions = positions.slice(0, params.mines).sort((a, b) => a - b);

  // At bet placement: no cells opened yet, multiplier = 1.0
  // Multiplier increases per safe cell opened (calculated separately on each click)
  const multiplierFinal = 1;

  const won = true; // Board is valid; player hasn't hit a bomb yet at bet placement
  const payout = BigInt(0); // No payout until player cashes out

  return {
    gameType: "mines" as const,
    roll: floats[0] * 100, // first float as reference roll
    won,
    payout,
    multiplier: multiplierFinal,
    mines: params.mines,
    safeCells: 0, // no cells opened yet at bet placement
    bombPositions,
    gridSize,
  };
}

/**
 * Calculate the multiplier for a given number of safe cells opened.
 * Used when player cashes out after opening `safeCells` cells.
 * Multiplier = cumulative probability inverse × (1 - edge)
 */
export function computeMinesMultiplier(
  mines: number,
  safeCells: number,
  houseEdge: number,
  gridSize: number = 25
): number {
  if (safeCells === 0) return 1;

  let cumulativeMultiplier = 1;
  let remainingCells = gridSize;
  let remainingMines = mines;

  for (let i = 0; i < safeCells; i++) {
    const remainingSafe = remainingCells - remainingMines;
    if (remainingSafe <= 0) break;
    const probSafe = remainingSafe / remainingCells;
    cumulativeMultiplier *= (1 / probSafe) * (1 - houseEdge / 10000);
    remainingCells--;
  }

  return Math.max(1, cumulativeMultiplier);
}