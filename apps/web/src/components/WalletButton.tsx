"use client";

import { useState } from "react";

export function WalletButton() {
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    // TODO: Integrate @solana/wallet-adapter when online
    setConnected(true);
    localStorage.setItem("sim_wallet_connected", "true");
  };

  const handleDisconnect = () => {
    setConnected(false);
    localStorage.removeItem("sim_wallet_connected");
  };

  return (
    <div className="flex items-center gap-4">
      {connected ? (
        <div className="flex items-center gap-2 text-sm text-bet-text-muted">
          <span className="text-bet-accent font-medium">Wallet Terhubung</span>
          <button
            onClick={handleDisconnect}
            className="px-3 py-1 bg-white/10 border border-white/10 rounded text-xs hover:bg-white/20 transition"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          className="px-4 py-2 bg-bet-accent text-bet-dark font-semibold rounded-lg hover:bg-green-400 transition"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
}

export function WalletStatus() {
  const connected =
    typeof window !== "undefined" &&
    localStorage.getItem("sim_wallet_connected") === "true";

  if (!connected) {
    return <span className="text-bet-text-muted">Tidak terhubung</span>;
  }

  return <span className="text-bet-accent font-medium">Terhubung (Simulasi)</span>;
}