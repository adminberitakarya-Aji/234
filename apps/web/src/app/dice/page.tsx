"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BetPanel } from "@/components/BetPanel";
import { FairnessBadge } from "@/components/FairnessBadge";
import { WalletStatus } from "@/components/WalletButton";

export default function DicePage() {
  const [balance, setBalance] = useState<string>("0.00");
  const [currency, setCurrency] = useState<string>("SOL");
  const [betResult, setBetResult] = useState<any>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) return;
        const res = await fetch(
          `http://localhost:4000/users/balance?userId=demo&currency=${currency}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setBalance(data.balance);
        }
      } catch (err) {
        console.error("Failed to fetch balance", err);
      }
    };
    fetchBalance();
  }, [currency]);

  const handlePlaceBet = async (data: {
    amount: string;
    targetRoll: number;
    clientSeed: string;
  }) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("http://localhost:4000/bet/dice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currency,
          amount: data.amount,
          targetRoll: data.targetRoll,
          clientSeed: data.clientSeed,
        }),
      });
      const result = await res.json();
      setBetResult(result);
      setBalance((prev) => {
        const current = parseFloat(prev) || 0;
        const betAmount = parseFloat(data.amount) || 0;
        return (current - betAmount).toFixed(9);
      });
    } catch (err) {
      console.error("Bet failed", err);
      alert("Taruhan gagal: " + err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bet-bg-panel">
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-xl font-bold text-bet-accent">BET</div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 text-sm">
              <WalletStatus />
              <span className="text-bet-text-muted">{balance} {currency}</span>
              <FairnessBadge serverSeedHash={betResult?.serverSeedHash} />
            </div>
            <div className="flex gap-2">
              <Link
                href="/deposit"
                className="px-4 py-2 bg-white/10 border border-white/10 rounded text-white hover:bg-white/20"
              >
                Deposit
              </Link>
              <Link
                href="/withdraw"
                className="px-4 py-2 bg-white/10 border border-white/10 rounded text-white hover:bg-white/20"
              >
                Withdraw
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <div className="bet-bg-panel border border-white/10 rounded-xl p-6 h-[500px] flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%_,#0a0a0a_100%)] pointer-events-none"></div>
              <div className="relative z-10 text-center space-y-8">
                <div className="text-6xl font-mono font-bold text-bet-accent">
                  {betResult?.result?.roll?.toFixed(2) ?? "--.--"}
                </div>
                <div className="text-bet-text-muted text-sm">
                  {betResult?.result?.won ? "MENANG" : betResult ? "KALAH" : "--"}
                </div>
                <div className="w-full max-w-xs h-64 border border-white/10 rounded-lg bg-black/50 flex items-center justify-center">
                  <div className="animate-pulse text-bet-text-muted">
                    Dice Area
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <BetPanel
              currency={currency}
              balance={balance}
              onPlaceBet={handlePlaceBet}
            />
            {betResult && (
              <div className="mt-6 bet-bg-panel border border-white/10 rounded-xl p-4">
                <h4 className="text-sm font-bold mb-2">Hasil Terakhir</h4>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-bet-text-muted">Roll:</span>
                    <span className="font-mono">{betResult.result.roll.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-bet-text-muted">Payout:</span>
                    <span className="font-mono">{betResult.result.payout.toString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-bet-text-muted">Nonce:</span>
                    <span>{betResult.nonce}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-bet-text-muted">House Edge:</span>
                    <span>{betResult.houseEdge / 100}%</span>
                  </div>
                </div>
                <a
                  href="/verify"
                  className="mt-2 block text-xs text-bet-accent hover:underline"
                >
                  Verifikasi hasil →
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}