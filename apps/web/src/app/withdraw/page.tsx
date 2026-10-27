"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function WithdrawPage() {
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>("SOL");
  const [destination, setDestination] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const fetchBalance = async () => {
      try {
        const res = await fetch(
          `http://localhost:4000/users/balance?userId=demo&currency=${currency}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setAmount(data.balance);
        }
      } catch (err) {
        console.error("Failed to fetch balance", err);
      }
    };
    fetchBalance();
  }, [currency]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("http://localhost:4000/withdraw/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currency,
          amount,
          destinationAddress: destination,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      alert("Error: " + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bet-bg-panel">
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-bet-accent">
            BET
          </Link>
          <Link
            href="/dice"
            className="px-4 py-2 text-white hover:text-bet-accent"
          >
            Kembali ke Game
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Withdraw</h1>

        <div className="bet-bg-panel border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">Ajukan Withdraw</h2>

          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="block text-sm text-bet-text-muted mb-1">
                Mata Uang
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-black border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-bet-accent"
              >
                <option value="SOL">SOL</option>
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-bet-text-muted mb-1">
                Jumlah (unit terkecil)
              </label>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-black border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-bet-accent"
              />
            </div>

            <div>
              <label className="block text-sm text-bet-text-muted mb-1">
                Alamat Tujuan
              </label>
              <input
                type="text"
                placeholder="Masukkan alamat wallet tujuan"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-black border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-bet-accent"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !amount || !destination}
              className="w-full py-3 bg-bet-accent text-bet-dark font-semibold rounded-lg hover:bg-green-400 disabled:opacity-50 transition"
            >
              {loading ? "Memproses..." : "Ajukan Withdraw"}
            </button>
          </form>

          {result && (
            <div className="mt-6 p-4 border border-white/10 rounded-lg">
              <h3 className="text-sm font-bold mb-2">Hasil</h3>
              <pre className="text-xs text-bet-text-muted overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-6 bet-bg-panel border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">Riwayat Withdraw</h2>
          <p className="text-bet-text-muted text-sm">
            Riwayat withdraw akan ditampilkan di sini setelah ada transaksi.
          </p>
        </div>
      </main>
    </div>
  );
}