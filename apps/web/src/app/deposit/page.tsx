"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function DepositPage() {
  const [depositAddress, setDepositAddress] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>("SOL");
  const [status, setStatus] = useState<"idle" | "created" | "completed">("idle");
  const [depositId, setDepositId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const fetchStatus = async () => {
      try {
        const res = await fetch(
          `http://localhost:4000/deposit/list?limit=5`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const latest = data.data?.[0];
          if (latest) {
            setDepositId(latest.id);
            setStatus(latest.status as any);
          }
        }
      } catch (err) {
        console.error("Failed to fetch deposit status", err);
      }
    };
    fetchStatus();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("http://localhost:4000/deposit/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currency, amount }),
      });
      const data = await res.json();
      if (data.success) {
        setDepositAddress(data.depositAddress);
        setDepositId(data.depositId);
        setStatus("created");
      } else {
        alert("Gagal membuat deposit");
      }
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
          <Link href="/dice" className="px-4 py-2 text-white hover:text-bet-accent">
            Kembali ke Game
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Deposit</h1>

        <div className="bet-bg-panel border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">Buat Deposit</h2>

          <form onSubmit={handleCreate} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading || !amount}
              className="w-full py-3 bg-bet-accent text-bet-dark font-semibold rounded-lg hover:bg-green-400 disabled:opacity-50 transition"
            >
              {loading ? "Memproses..." : "Buat Deposit"}
            </button>
          </form>

          {status === "created" && depositAddress && depositId && (
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <h3 className="text-sm font-bold text-green-400 mb-2">
                Alamat Deposit
              </h3>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={depositAddress}
                  readOnly
                  className="flex-1 bg-black border border-white/10 rounded px-3 py-2 text-green-400 font-mono text-sm"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(depositAddress);
                    alert("Disalin ke clipboard");
                  }}
                  className="px-3 py-2 bg-white/10 border border-white/10 rounded text-green-400 hover:bg-white/20"
                >
                  Salin
                </button>
              </div>
              <p className="text-xs text-bet-text-muted">
                Kirim {amount} {currency} ke alamat di atas.
              </p>
              <p className="text-xs text-bet-text-muted">
                Deposit ID: {depositId}
              </p>
            </div>
          )}

          {status === "completed" && (
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <h3 className="text-sm font-bold text-green-400 mb-2">
                Deposit Selesai
              </h3>
              <p className="text-bet-text-muted text-sm">
                Dana telah dikreditkan ke saldo Anda.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 bet-bg-panel border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">Riwayat Deposit</h2>
          <p className="text-bet-text-muted text-sm">
            Riwayat deposit akan ditampilkan di sini setelah ada transaksi.
          </p>
        </div>
      </main>
    </div>
  );
}