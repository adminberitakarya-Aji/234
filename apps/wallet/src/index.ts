import { Connection, Keypair } from "@solana/web3.js";

const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(rpcUrl, "confirmed");

// Hot wallet keypair (from env - keep minimal funds on devnet)
const hotWalletPrivateKey = process.env.WALLET_PRIVATE_KEY;
let hotWallet: Keypair | null = null;

if (hotWalletPrivateKey) {
  try {
    const secret = Uint8Array.from(
      hotWalletPrivateKey.split(",").map(Number),
    );
    hotWallet = Keypair.fromSecretKey(secret);
  } catch (e) {
    console.error("Failed to load hot wallet private key", e);
  }
}

export interface DepositEvent {
  txHash: string;
  userAddress: string;
  amount: bigint;
  currency: string;
  slot: number;
}

export interface WithdrawRequest {
  withdrawId: string;
  userId: string;
  currency: string;
  amount: bigint;
  destinationAddress: string;
}

export interface WithdrawResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Deposit Watcher
 * Polls Solana devnet for incoming transactions to known deposit addresses.
 * In production, use Helius webhooks instead of polling.
 */
export class DepositWatcher {
  private lastProcessedSlot = 0;
  private depositAddresses: Map<string, string> = new Map(); // depositAddress -> userId

  constructor() {}

  registerDepositAddress(depositAddress: string, userId: string) {
    this.depositAddresses.set(depositAddress, userId);
  }

  async poll() {
    try {
      const latestSlot = await connection.getSlot();
      if (latestSlot <= this.lastProcessedSlot) {
        return;
      }

      // TODO: In production, use getSignaturesForAddress per deposit address
      // For devnet demo, this is a placeholder
      this.lastProcessedSlot = latestSlot;
    } catch (err) {
      console.error("Deposit watcher poll error", err);
    }
  }

  async processDepositEvent(event: DepositEvent): Promise<boolean> {
    // Notify API to confirm deposit
    const apiUrl = process.env.API_URL || "http://localhost:4000";
    try {
      const res = await fetch(`${apiUrl}/deposit/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositId: event.userAddress, // In production, map tx to deposit ID
          txHash: event.txHash,
        }),
      });
      return res.ok;
    } catch (err) {
      console.error("Failed to confirm deposit", err);
      return false;
    }
  }
}

/**
 * Withdraw Signer
 * Signs and broadcasts withdraw transactions from the hot wallet.
 */
export class WithdrawSigner {
  constructor(private connection: Connection) {}

  async signAndSend(withdraw: WithdrawRequest): Promise<WithdrawResult> {
    if (!hotWallet) {
      return {
        success: false,
        error: "Hot wallet not configured",
      };
    }

    try {
      // TODO: Build actual Solana transfer transaction
      // For devnet demo, simulate the transaction
      console.log(
        `Simulating withdraw: ${withdraw.amount} ${withdraw.currency} to ${withdraw.destinationAddress}`,
      );

      // Notify API to complete withdraw
      const apiUrl = process.env.API_URL || "http://localhost:4000";
      const res = await fetch(`${apiUrl}/withdraw/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          withdrawId: withdraw.withdrawId,
          txHash: `simulated_tx_${Date.now()}`,
        }),
      });

      if (!res.ok) {
        return { success: false, error: "API confirm failed" };
      }

      return {
        success: true,
        txHash: `simulated_tx_${Date.now()}`,
      };
    } catch (err) {
      console.error("Withdraw signer error", err);
      // Notify API to reject
      try {
        const apiUrl = process.env.API_URL || "http://localhost:4000";
        await fetch(`${apiUrl}/withdraw/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            withdrawId: withdraw.withdrawId,
            reason: err instanceof Error ? err.message : "Unknown error",
          }),
        });
      } catch {}
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
}

export const depositWatcher = new DepositWatcher();
export const withdrawSigner = new WithdrawSigner(connection);

export async function startWalletService() {
  console.log(`Wallet service started on ${rpcUrl}`);
  console.log(`Hot wallet: ${hotWallet ? hotWallet.publicKey.toString() : "NOT CONFIGURED"}`);

  // Poll for deposits every 30 seconds
  setInterval(() => {
    depositWatcher.poll().catch(console.error);
  }, 30000);

  // Process pending withdraws every 60 seconds
  setInterval(async () => {
    const apiUrl = process.env.API_URL || "http://localhost:4000";
    try {
      const res = await fetch(`${apiUrl}/withdraw/pending`);
      const withdraws: WithdrawRequest[] = await res.json();

      for (const withdraw of withdraws) {
        await withdrawSigner.signAndSend(withdraw);
      }
    } catch (err) {
      console.error("Failed to fetch pending withdraws", err);
    }
  }, 60000);
}

startWalletService().catch(console.error);