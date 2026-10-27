-- Double-entry ledger schema
-- Append-only: every transaction creates at least 2 ledger entries (debit + credit)
-- Balance is derived, never stored as a mutable column

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  user_id UUID NOT NULL,
  currency VARCHAR(10) NOT NULL,
  amount BIGINT NOT NULL, -- positive = credit, negative = debit, in smallest currency unit
  balance_after BIGINT NOT NULL, -- running balance after this entry
  entry_type VARCHAR(20) NOT NULL, -- 'debit' | 'credit'
  reference_type VARCHAR(20), -- 'bet' | 'win' | 'deposit' | 'withdraw' | 'rakeback' | 'cashback'
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_id ON ledger_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction_id ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON ledger_entries(created_at);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255),
  wallet_address VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'player',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User balances (derived view - materialized from ledger)
CREATE TABLE IF NOT EXISTS user_balances (
  user_id UUID NOT NULL,
  currency VARCHAR(10) NOT NULL,
  balance BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, currency)
);

-- Transactions log
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(20) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  amount BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reference_id UUID,
  tx_hash VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);