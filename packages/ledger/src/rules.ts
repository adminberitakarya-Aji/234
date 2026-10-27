/**
 * Ledger invariants that must always hold:
 * 1. Sum of entries per transaction = 0 (double-entry bookkeeping)
 * 2. No user balance can go negative
 * 3. Every transaction has at least 2 entries (debit + credit)
 */

export interface LedgerInvariantCheck {
  valid: boolean;
  errors: string[];
}

export function checkDoubleEntry(
  entries: Array<{ transactionId: string; amount: bigint }>
): LedgerInvariantCheck {
  const errors: string[] = [];
  const byTx = new Map<string, bigint>();

  for (const entry of entries) {
    const current = byTx.get(entry.transactionId) ?? BigInt(0);
    byTx.set(entry.transactionId, current + entry.amount);
  }

  for (const [txId, net] of byTx) {
    if (net !== BigInt(0)) {
      errors.push(`Transaction ${txId} has non-zero net sum: ${net.toString()}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function checkNoNegativeBalance(
  balances: Array<{ userId: string; currency: string; balance: bigint }>
): LedgerInvariantCheck {
  const errors: string[] = [];

  for (const b of balances) {
    if (b.balance < BigInt(0)) {
      errors.push(`Negative balance for user ${b.userId} currency ${b.currency}: ${b.balance.toString()}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}