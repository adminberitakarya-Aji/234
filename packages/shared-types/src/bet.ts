import type { Currency } from "./currency";
import type { GameType, GameResult } from "./game";

export interface BetPlaceInput {
  userId: string;
  gameType: GameType;
  currency: Currency;
  amount: bigint; // in smallest currency unit
  clientSeed: string;
  targetRoll?: number; // for dice: target roll (0-99.99)
  rows?: number; // for plinko: number of peg rows
  mines?: number; // for mines: number of bombs
}

export interface BetPlaceOutput {
  betId: string;
  nonce: number;
  serverSeedHash: string;
  result: GameResult;
  newBalance: bigint;
  houseEdge: number; // basis points
  rakeback: bigint; // in smallest currency unit
}

export interface BetHistoryItem {
  id: string;
  userId: string;
  gameType: GameType;
  currency: Currency;
  amount: bigint;
  payout: bigint;
  result: GameResult;
  houseEdge: number;
  clientSeed: string;
  serverSeed: string; // revealed after session ends
  nonce: number;
  createdAt: Date;
  batchId?: string;
}

export interface FlashBetRuleInput {
  gameType: GameType;
  baseBet: bigint;
  maxBet: bigint;
  stopLoss: bigint;
  stopWin: bigint;
  maxRounds: number;
  onWin: "reset" | "paroli" | "martingale";
  onLoss: "reset" | "martingale" | "paroli";
}

export interface FlashBetInput {
  userId: string;
  currency: Currency;
  betAmount: bigint; // in smallest currency unit
  count: number; // 1 to 200
  targetRoll: number; // 0 to 99.99
  clientSeed: string;
  serverSeed?: string; // existing server seed for continuing session
  serverSeedHash?: string; // existing hash
  nonce?: number; // starting nonce
  idempotencyKey: string;
  rule?: FlashBetRuleInput; // optional; defaults to flat stake, continue on win/loss
}

export interface FlashBetResultItem {
  nonce: number;
  roll: number;
  won: boolean;
  stake: bigint;
  payout: bigint;
}

export interface FlashBetOutput {
  batchId: string;
  mode: "flash";
  betCount: number;
  totalStake: bigint;
  totalPayout: bigint;
  nonceStart: number;
  nonceEnd: number;
  stopReason: string | null;
  finalBalance: bigint;
  bets: FlashBetResultItem[];
}