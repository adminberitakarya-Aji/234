import type { TransactionType, TransactionStatus } from "@bet/shared-types";

export const INSERT_TRANSACTION = `
  INSERT INTO transactions (id, user_id, type, currency, amount, status, reference_id, tx_hash)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  RETURNING *
`;

export const INSERT_LEDGER_ENTRY = `
  INSERT INTO ledger_entries (transaction_id, user_id, currency, amount, balance_after, entry_type, reference_type, reference_id)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  RETURNING *
`;

export const GET_USER_BALANCE = `
  SELECT balance FROM user_balances WHERE user_id = $1 AND currency = $2
`;

export const GET_LEDGER_ENTRIES = `
  SELECT * FROM ledger_entries
  WHERE user_id = $1
  ORDER BY created_at DESC
  LIMIT $2 OFFSET $3
`;

export const VERIFY_LEDGER_INVARIANT = `
  -- Sum of all entries for a transaction should be 0 (double-entry)
  SELECT transaction_id, SUM(amount) as net
  FROM ledger_entries
  GROUP BY transaction_id
  HAVING SUM(amount) <> 0
`;

export const GET_PENDING_DEPOSITS = `
  SELECT * FROM transactions
  WHERE type = 'deposit' AND status = 'pending'
  ORDER BY created_at ASC
`;

export const GET_PENDING_WITHDRAWS = `
  SELECT * FROM transactions
  WHERE type = 'withdraw' AND status = 'pending'
  ORDER BY created_at ASC
`;

export type { TransactionType, TransactionStatus };