import type { GameType } from "@bet/shared-types";

export interface AutoBetRule {
  gameType: GameType;
  baseBet: bigint;
  maxBet: bigint;
  stopLoss: bigint; // stop when net loss reaches this
  stopWin: bigint; // stop when net win reaches this
  maxRounds: number;
  onWin: "reset" | "paroli" | "martingale";
  onLoss: "reset" | "martingale" | "paroli";
}

export interface AutoBetResult {
  shouldContinue: boolean;
  nextBet: bigint;
  reason: string;
}

export function computeAutoBetRule(
  rule: AutoBetRule,
  round: number,
  netResult: bigint,
  lastWon: boolean
): AutoBetResult {
  if (round >= rule.maxRounds) {
    return { shouldContinue: false, nextBet: BigInt(0), reason: "max_rounds_reached" };
  }

  if (netResult <= -rule.stopLoss) {
    return { shouldContinue: false, nextBet: BigInt(0), reason: "stop_loss" };
  }

  if (netResult >= rule.stopWin) {
    return { shouldContinue: false, nextBet: BigInt(0), reason: "stop_win" };
  }

  let nextBet = rule.baseBet;

  if (lastWon) {
    if (rule.onWin === "martingale") {
      nextBet = rule.baseBet; // reset after win
    } else if (rule.onWin === "paroli") {
      nextBet = rule.baseBet * BigInt(2); // double after win
    }
  } else {
    if (rule.onLoss === "martingale") {
      nextBet = rule.baseBet * BigInt(2); // double after loss
    } else if (rule.onLoss === "paroli") {
      nextBet = rule.baseBet; // reset after loss
    }
  }

  if (nextBet > rule.maxBet) {
    nextBet = rule.maxBet;
  }

  return { shouldContinue: true, nextBet, reason: "continue" };
}