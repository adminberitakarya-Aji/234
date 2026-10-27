import type { Currency } from "./currency";

export type TransactionType = "deposit" | "withdraw" | "bet" | "win" | "rakeback" | "cashback";

export type TransactionStatus = "pending" | "completed" | "failed" | "reversed";

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  currency: Currency;
  amount: bigint; // in smallest currency unit, positive for credit, negative for debit
  balanceAfter: bigint;
  referenceId?: string; // bet id, tx hash, etc.
  txHash?: string; // on-chain transaction hash
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepositInput {
  userId: string;
  currency: Currency;
  amount: bigint;
  txHash: string;
}

export interface WithdrawInput {
  userId: string;
  currency: Currency;
  amount: bigint;
  destinationAddress: string;
}