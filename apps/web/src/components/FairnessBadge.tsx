"use client";

export function FairnessBadge({ serverSeedHash }: { serverSeedHash?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs">
      <span className="w-2 h-2 rounded-full bg-bet-accent animate-pulse"></span>
      <span className="text-bet-accent font-mono">
        Provably Fair
      </span>
      {serverSeedHash && (
        <span className="text-bet-text-muted truncate max-w-xs">
          {serverSeedHash.slice(0, 16)}…
        </span>
      )}
    </div>
  );
}