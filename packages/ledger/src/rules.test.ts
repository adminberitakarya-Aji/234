import { describe, it, expect } from "vitest";
import {
  checkDoubleEntry,
  checkNoNegativeBalance,
} from "./rules";

/**
 * Ledger Invariant Concurrency Tests
 *
 * These tests verify the double-entry ledger invariants that prevent
 * race conditions when multiple bets are placed concurrently.
 *
 * The production fix uses SELECT FOR UPDATE within $transaction to lock
 * balance rows. These tests verify the invariant checker catches any
 * non-zero net sum or negative balance that would result from a race.
 */
describe("Ledger double-entry invariant (concurrency safety)", () => {
  it("rejects a transaction with non-zero net sum (double-entry violation)", () => {
    // Simulates two concurrent bets that each debit the user but only
    // one credits — net sum would be non-zero.
    const entries = [
      { transactionId: "tx-1", amount: BigInt(-100) }, // debit user
      { transactionId: "tx-1", amount: BigInt(50) }, // credit user (partial)
      { transactionId: "tx-1", amount: BigInt(30) }, // credit house (partial)
      // Missing 20 — race condition lost a write
    ];

    const result = checkDoubleEntry(entries);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("tx-1");
    expect(result.errors[0]).toContain("non-zero net sum");
  });

  it("accepts a properly balanced double-entry transaction", () => {
    const entries = [
      { transactionId: "tx-1", amount: BigInt(-100) }, // debit user
      { transactionId: "tx-1", amount: BigInt(99) }, // credit user (win)
      { transactionId: "tx-1", amount: BigInt(1) }, // credit house (edge)
    ];

    const result = checkDoubleEntry(entries);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("detects multiple transactions each with non-zero net sum", () => {
    const entries = [
      { transactionId: "tx-1", amount: BigInt(-100) },
      { transactionId: "tx-1", amount: BigInt(100) }, // balanced
      { transactionId: "tx-2", amount: BigInt(-50) },
      { transactionId: "tx-2", amount: BigInt(30) }, // unbalanced — missing 20
    ];

    const result = checkDoubleEntry(entries);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("tx-2");
  });

  it("rejects negative balance for any user", () => {
    const balances = [
      { userId: "user-1", currency: "USDC", balance: BigInt(100) },
      { userId: "user-2", currency: "USDC", balance: BigInt(-50) }, // negative!
      { userId: "user-3", currency: "USDC", balance: BigInt(0) },
    ];

    const result = checkNoNegativeBalance(balances);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("user-2");
    expect(result.errors[0]).toContain("Negative balance");
  });

  it("accepts all non-negative balances", () => {
    const balances = [
      { userId: "user-1", currency: "USDC", balance: BigInt(0) },
      { userId: "user-2", currency: "USDC", balance: BigInt(100) },
      { userId: "user-3", currency: "SOL", balance: BigInt(999999) },
    ];

    const result = checkNoNegativeBalance(balances);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("simulates concurrent bet race condition: two debits, one credit", () => {
    // Race condition scenario:
    // Bet A (concurrent): reads balance=100, debits 100
    // Bet B (concurrent): reads balance=100, debits 100
    // Only one credit of 100 is written (lost update)
    // Net: -100 -100 + 100 = -100 (non-zero)
    const entries = [
      { transactionId: "tx-race-1", amount: BigInt(-100) }, // Bet A debit
      { transactionId: "tx-race-1", amount: BigInt(-100) }, // Bet B debit
      { transactionId: "tx-race-1", amount: BigInt(100) }, // Only one credit written
    ];

    const result = checkDoubleEntry(entries);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("tx-race-1");
    expect(result.errors[0]).toContain("non-zero net sum");
  });
});
