import type { Currency } from "@bet/shared-types";
import type { ChainAdapter } from "./adapter";
import { Connection, PublicKey } from "@solana/web3.js";

/**
 * Solana implementation of ChainAdapter.
 * Uses Helius RPC or public devnet RPC.
 */
export class SolanaChainAdapter implements ChainAdapter {
  private connection: Connection;
  private commitment: "confirmed" | "finalized";

  constructor(rpcUrl: string, commitment: "confirmed" | "finalized" = "confirmed") {
    this.connection = new Connection(rpcUrl, commitment);
    this.commitment = commitment;
  }

  async getBalance(address: string, currency: Currency): Promise<bigint> {
    try {
      const pubkey = new PublicKey(address);
      if (currency === "SOL") {
        const balance = await this.connection.getBalance(pubkey);
        return BigInt(balance); // lamports
      }
      // For SPL tokens (USDC, USDT), we'd need to find token accounts
      // This is a stub - full SPL implementation requires token program accounts
      throw new Error(`SPL token balance for ${currency} not yet implemented`);
    } catch (error) {
      throw new Error(`Failed to get balance: ${error}`);
    }
  }

  async getTransactionStatus(txHash: string): Promise<"pending" | "confirmed" | "finalized" | "failed"> {
    try {
      const tx = await this.connection.getTransaction(txHash, {
        commitment: this.commitment,
      });
      if (!tx) return "pending";
      if (tx.meta?.err) return "failed";
      return "finalized";
    } catch {
      return "pending";
    }
  }

  async recordCommitment(_epoch: number, _merkleRoot: string): Promise<string> {
    // Stub: In phase 1 this uses Memo transaction
    // In phase 2 this uses Anchor program commit_epoch
    throw new Error("recordCommitment not yet implemented - waiting for Anchor program");
  }

  async verifyCommitment(_epoch: number, _merkleRoot: string): Promise<boolean> {
    throw new Error("verifyCommitment not yet implemented");
  }

  async getCurrentEpoch(): Promise<number> {
    const epochInfo = await this.connection.getEpochInfo();
    return epochInfo.epoch;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.connection.getEpochInfo();
      return true;
    } catch {
      return false;
    }
  }
}