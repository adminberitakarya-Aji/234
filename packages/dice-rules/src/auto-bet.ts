import type { GameType } from "@bet/shared-types";

export interface AutoBetRule {
  gameType: GameType;
  baseBet: bigint;
  maxBet: bigint;
  stopLoss: bigint; // stop when net loss reaches this (0 = no limit)
  stopWin: bigint; // stop when net win reaches this (0 = no limit)
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
  lastWon: boolean,
  lastBet: bigint
): AutoBetResult {
  if (round >= rule.maxRounds) {
    return { shouldContinue: false, nextBet: BigInt(0), reason: "max_rounds_reached" };
  }

  // stopLoss / stopWin of 0 means "no limit" — do not stop on the very first bet
  if (rule.stopLoss > BigInt(0) && netResult <= -rule.stopLoss) {
    return { shouldContinue: false, nextBet: BigInt(0), reason: "stop_loss" };
  }

  if (rule.stopWin > BigInt(0) && netResult >= rule.stopWin) {
    return { shouldContinue: false, nextBet: BigInt(0), reason: "stop_win" };
  }

  let nextBet = rule.baseBet;

  if (lastWon) {
    if (rule.onWin === "martingale") {
      nextBet = rule.baseBet; // reset to base after a win
    } else if (rule.onWin === "paroli") {
      nextBet = lastBet * BigInt(2); // double the previous bet after a win
    }
  } else {
    if (rule.onLoss === "martingale") {
      nextBet = lastBet * BigInt(2); // double the previous bet after a loss (progressive)
    } else if (rule.onLoss === "paroli") {
      nextBet = rule.baseBet; // reset to base after a loss
    }
  }

  if (nextBet > rule.maxBet) {
    nextBet = rule.maxBet;
  }

  return { shouldContinue: true, nextBet, reason: "continue" };
}