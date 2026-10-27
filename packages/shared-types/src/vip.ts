export type VipTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface VipTierConfig {
  tier: VipTier;
  minWagered: bigint; // in USD cents equivalent
  rakebackPercent: number; // basis points
  cashbackPercent: number; // basis points
}

export interface UserVip {
  userId: string;
  tier: VipTier;
  totalWagered: bigint; // in smallest currency unit (converted to USD)
  updatedAt: Date;
}

export interface RakebackLedger {
  id: string;
  userId: string;
  amount: bigint; // in smallest currency unit
  betId: string;
  createdAt: Date;
}

export interface CashbackLedger {
  id: string;
  userId: string;
  amount: bigint; // in smallest currency unit
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
}