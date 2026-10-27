"use client";

import { useState } from "react";
import Link from "next/link";
import { WalletButton } from "@/components/WalletButton";

export default function LoginPage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [signature, setSignature] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, signature, message }),
      });
      const data = await res.json();
      if (data.success) {
        // Store session
        localStorage.setItem("access_token", data.session.accessToken);
        localStorage.setItem("refresh_token", data.session.refreshToken);
        window.location.href = "/dice";
      } else {
        alert("Login gagal");
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
        <Link href="/" className="text-xl font-bold text-bet-accent">
          BET
        </Link>
      </nav>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bet-bg-panel border border-white/10 rounded-xl p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-2 text-center">Masuk</h1>
          <p className="text-bet-text-muted text-sm text-center mb-6">
            Eksperimen Solana Devnet — token tidak bernilai
          </p>

          <div className="mb-6">
            <WalletButton />
          </div>

          <div className="border border-white/10 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-bet-text-muted mb-3">
              Debug: Simulasi Wallet Sign
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-bet-text-muted mb-1">
                  Wallet Address
                </label>
                <input
                  type="text"
                  placeholder="Masukkan alamat wallet Solana"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-bet-accent"
                />
              </div>
              <div>
                <label className="block text-xs text-bet-text-muted mb-1">
                  Signature
                </label>
                <input
                  type="text"
                  placeholder="Masukkan tanda tangan"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-bet-accent"
                />
              </div>
              <div>
                <label className="block text-xs text-bet-text-muted mb-1">
                  Message
                </label>
                <input
                  type="text"
                  placeholder="Pesan yang ditandatangani"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-bet-accent"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading || !walletAddress}
            className="w-full py-3 bg-bet-accent text-bet-dark font-semibold rounded-lg hover:bg-green-400 disabled:opacity-50 transition"
          >
            {loading ? "Memproses..." : "Masuk ke Platform"}
          </button>

          <p className="mt-6 text-xs text-bet-text-muted text-center">
            DEVNET — Token tidak bernilai • Tidak ada uang nyata
          </p>
        </div>
      </main>
    </div>
  );
}