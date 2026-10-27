export type GameType = "dice" | "crash" | "plinko" | "mines";

export const GAME_TYPES: GameType[] = ["dice", "crash", "plinko", "mines"];

export function isGameType(value: string): value is GameType {
  return GAME_TYPES.includes(value as GameType);
}

export interface GameConfig {
  gameType: GameType;
  houseEdge: number; // basis points, e.g. 100 = 1%
  minBet: bigint; // in smallest currency unit
  maxBet: bigint;
  winProbability: number; // 0 to 1
  isActive: boolean;
}

export interface GameResult {
  gameType: GameType;
  roll: number; // 0 to 99.99 for dice/plinko/mines, multiplier for crash
  won: boolean;
  payout: bigint; // in smallest currency unit
  multiplier: number;
}