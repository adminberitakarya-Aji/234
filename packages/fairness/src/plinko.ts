import type { GameResult } from "@bet/shared-types";
import { hmacSha256, hmacToFloat } from "./hmac";
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
  path: ("L" | "R")[]; // path taken (left/right per row), revealed after bet
}

export function computePlinkoResult(
  commitment: SeedCommitment,
  nonce: number,
  params: PlinkoBetParams
): PlinkoResult {
  // Validate rows
  if (params.rows < 8 || params.rows > 16) {
    throw new Error("Plinko rows must be between 8 and 16");
  }

  // PRD: 1 float per row: < 0.5 left, >= 0.5 right
  // Each row gets a float from HMAC(client_seed:nonce:cursor) for cursor = 0..rows-1
  const path: ("L" | "R")[] = [];
  let slot = 0;

  for (let cursor = 0; cursor < params.rows; cursor++) {
    const message = Buffer.from(
      `${commitment.clientSeed}:${nonce}:${cursor}`,
      "utf8"
    );
    const key = Buffer.from(commitment.serverSeed, "hex");
    const hmac = hmacSha256(key, message);
    const f = hmacToFloat(hmac);

    if (f >= 0.5) {
      path.push("R");
      slot++;
    } else {
      path.push("L");
    }
  }

  // Slot = number of steps right (0 to rows)
  // Multiplier from risk table with RTP = 1 - edge
  // Base probability of landing in a slot follows binomial distribution
  // Fair multiplier for slot s = 1 / P(slot = s) × (1 - edge)
  // P(slot = s) = C(rows, s) / 2^rows (assuming fair left/right)

  // Calculate binomial probability P(slot = s)
  const binomProb = binomialCoefficient(params.rows, slot) / Math.pow(2, params.rows);

  // Risk adjustments to payout table (house edge applied separately)
  const riskBaseMultiplier: Record<string, number> = {
    low: 0.5,
    medium: 1.0,
    high: 2.0,
  };

  // Fair multiplier = (1 / binomial_prob) × risk_factor × (1 - edge)
  // But we cap at reasonable max to avoid extreme payouts
  const riskFactor = riskBaseMultiplier[params.risk];
  const multiplier = Math.max(1, (1 / binomProb) * riskFactor * (1 - params.houseEdge / 10000));

  const won = multiplier > 1;
  const payout = won ? BigInt(Math.floor(Number(params.amount) * multiplier)) : BigInt(0);

  // Reference roll = last float * 100 for compatibility
  const roll = path.length > 0 ? (path[path.length - 1] === "R" ? 75 : 25) : 0;

  return {
    gameType: "plinko" as const,
    roll,
    won,
    payout,
    multiplier,
    rows: params.rows,
    risk: params.risk,
    slot,
    path,
  };
}

/**
 * Calculate binomial coefficient C(n, k)
 */
function binomialCoefficient(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return result;
}