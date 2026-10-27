import type { GameType } from "@bet/shared-types";

export interface FlashBetParams {
  gameType: GameType;
  betAmount: bigint;
  count: number; // number of rapid-fire bets
  targetRoll: number;
  onWin: "stop" | "continue";
  onLoss: "stop" | "continue";
}

export interface FlashBetResult {
  completed: boolean;
  betsPlaced: number;
  totalWagered: bigint;
  totalWon: bigint;
  reason: string;
}

export function simulateFlashBet(
  params: FlashBetParams,
  results: Array<{ won: boolean; payout: bigint }>
): FlashBetResult {
  let betsPlaced = 0;
  let totalWagered = BigInt(0);
  let totalWon = BigInt(0);

  for (const result of results) {
    if (betsPlaced >= params.count) break;

    totalWagered += params.betAmount;
    totalWon += result.payout;
    betsPlaced++;

    if (result.won) {
      if (params.onWin === "stop") break;
    } else {
      if (params.onLoss === "stop") break;
    }
  }

  return {
    completed: betsPlaced >= params.count,
    betsPlaced,
    totalWagered,
    totalWon,
    reason: betsPlaced >= params.count ? "count_reached" : "stop_condition",
  };
}