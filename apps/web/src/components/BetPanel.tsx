"use client";

import { useState } from "react";

export interface BetPanelProps {
  currency: string;
  balance: string;
  onPlaceBet: (data: {
    amount: string;
    targetRoll: number;
    clientSeed: string;
  }) => Promise<void>;
}

export function BetPanel({ currency, balance, onPlaceBet }: BetPanelProps) {
  const [amount, setAmount] = useState("1.00");
  const [targetRoll, setTargetRoll] = useState(50);
  const [clientSeed, setClientSeed] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const quickSelect = (multiplier: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current * multiplier).toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onPlaceBet({
        amount,
        targetRoll,
        clientSeed: clientSeed || `player_${Date.now()}`,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bet-bg-panel border border-white/10 rounded-xl p-6">
      <h3 className="text-lg font-bold mb-4">Taruhan Dice</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-bet-text-muted mb-1">
              Jumlah Taruhan ({currency})
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-black border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-bet-accent"
                disabled={loading}
              />
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => quickSelect(0.5)}
                  disabled={loading}
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded text-xs text-bet-text-muted hover:bg-white/10"
                >
                  ½
                </button>
                <button
                  type="button"
                  onClick={() => quickSelect(2)}
                  disabled={loading}
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded text-xs text-bet-text-muted hover:bg-white/10"
                >
                  2×
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-bet-text-muted mb-1">
              Target Roll (0–99.99)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="99.99"
              value={targetRoll}
              onChange={(e) => setTargetRoll(parseFloat(e.target.value) || 0)}
              className="w-full bg-black border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-bet-accent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm text-bet-text-muted mb-1">
              Saldo
            </label>
            <div className="bg-black border border-white/10 rounded px-4 py-2 text-bet-accent font-mono">
              {balance} {currency}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Client Seed (opsional)"
            value={clientSeed}
            onChange={(e) => setClientSeed(e.target.value)}
            className="flex-1 bg-black border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-bet-accent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || parseFloat(amount) <= 0}
            className="flex-1 py-3 bg-bet-accent text-bet-dark font-semibold rounded-lg hover:bg-green-400 disabled:opacity-50 transition"
          >
            {loading ? "Memproses..." : "Taruh"}
          </button>
        </div>

        {result && (
          <div className="mt-4 p-4 bg-white/5 rounded border border-white/10">
            <div className="flex justify-between text-sm">
              <span className="text-bet-text-muted">Roll:</span>
              <span className="font-mono">{result.result?.roll?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-bet-text-muted">Hasil:</span>
              <span className={`font-bold ${result.result?.won ? "text-bet-accent" : "text-danger"}`}>
                {result.result?.won ? "MENANG" : "KALAH"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-bet-text-muted">Payout:</span>
              <span className="font-mono">{result.result?.payout?.toString()}</span>
            </div>
            <div className="mt-2 text-xs text-bet-text-muted">
              Nonce: {result.nonce} | Server Seed Hash: {result.serverSeedHash?.slice(0, 16)}…
            </div>
          </div>
        )}
      </form>
    </div>
  );
}