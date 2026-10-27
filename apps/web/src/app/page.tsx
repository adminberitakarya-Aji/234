"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WalletButton } from "@/components/WalletButton";

export default function Home() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      setConnected(true);
    }
  }, []);

  if (connected) {
    return (
      <div className="min-h-screen flex flex-col bet-bg-panel">
        <nav className="border-b border-white/10 px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/dice" className="text-xl font-bold text-bet-accent">
              BET
            </Link>
            <div className="flex items-center gap-4">
              <a
                href="/dice"
                className="px-4 py-2 bg-bet-accent text-bet-dark font-semibold rounded hover:bg-green-400"
              >
                Main Dice
              </a>
              <a
                href="/verify"
                className="px-4 py-2 text-white hover:text-bet-accent"
              >
                Verifikasi
              </a>
            </div>
          </div>
        </nav>
        <main className="flex-1 max-w-7xl mx-auto p-6 text-center">
          <h1 className="text-4xl font-bold mb-4">Selamat Datang</h1>
          <p className="text-bet-text-muted text-lg mb-8">
            Anda sudah login. Pilih game untuk memulai.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              "Dice",
              "Crash",
              "Plinko",
              "Mines",
            ].map((game) => (
              <div
                key={game}
                className="bet-bg-panel border border-white/10 rounded-xl p-6"
              >
                <h3 className="text-xl font-bold mb-2">{game}</h3>
                <p className="text-bet-text-muted text-sm mb-4">
                  Game {game} dengan provably fair
                </p>
                {game === "Dice" ? (
                  <a
                    href="/dice"
                    className="w-full py-3 bg-bet-accent text-bet-dark font-semibold rounded-lg hover:bg-green-400 transition"
                  >
                    Main
                  </a>
                ) : (
                  <button
                    className="w-full py-3 bg-white/10 border border-white/10 rounded text-white hover:bg-white/20 transition disabled:opacity-50"
                    disabled
                  >
                    Segera hadir
                  </button>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bet-bg-panel">
      <nav className="border-b border-white/10 px-6 py-4">
        <Link href="/" className="text-xl font-bold text-bet-accent">
          BET
        </Link>
      </nav>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bet-bg-panel border border-white/10 rounded-xl p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-2">Selamat Datang di BET</h1>
          <p className="text-bet-text-muted text-sm mb-6">
            Eksperimen Solana Devnet — token tidak bernilai
          </p>
          <WalletButton />
          <div className="mt-6">
            <Link
              href="/dice"
              className="w-full py-3 bg-bet-accent text-bet-dark font-semibold rounded-lg hover:bg-green-400 transition"
            >
              Langsung ke Dice (Tanpa Login)
            </Link>
          </div>
          <p className="mt-6 text-xs text-bet-text-muted">
            DEVNET — Token tidak bernilai • Tidak ada uang nyata
          </p>
        </div>
      </main>
    </div>
  );
}