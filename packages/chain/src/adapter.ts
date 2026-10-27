import type { Currency } from "@bet/shared-types";

export interface ChainAdapter {
  /**
   * Get the native balance of a wallet address (in lamports for SOL, or smallest unit for SPL)
   */
  getBalance(address: string, currency: Currency): Promise<bigint>;

  /**
   * Get transaction status by hash
   */
  getTransactionStatus(txHash: string): Promise<"pending" | "confirmed" | "finalized" | "failed">;

  /**
   * Record a seed commitment hash on-chain (Memo tx or Anchor program)
   */
  recordCommitment(epoch: number, merkleRoot: string): Promise<string>; // returns tx hash

  /**
   * Verify a commitment root was recorded on-chain
   */
  verifyCommitment(epoch: number, merkleRoot: string): Promise<boolean>;

  /**
   * Get latest epoch
   */
  getCurrentEpoch(): Promise<number>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}