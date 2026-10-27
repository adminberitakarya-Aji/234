export type Currency = "SOL" | "USDC" | "USDT";

export const CURRENCY_DECIMALS: Record<Currency, number> = {
  SOL: 9,
  USDC: 6,
  USDT: 6,
} as const;

export function isCurrency(value: string): value is Currency {
  return value === "SOL" || value === "USDC" || value === "USDT";
}