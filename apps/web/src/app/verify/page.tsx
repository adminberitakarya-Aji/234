export default function VerifyPage() {
  return (
    <div className="min-h-screen flex flex-col bet-bg-panel">
      <nav className="border-b border-white/10 px-6 py-4">
        <h1 className="text-xl font-bold text-bet-accent">Verifikasi Provably Fair</h1>
      </nav>
      <main className="flex-1 max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-6">Verifikasi Hasil Taruhan</h2>
        <p className="text-bet-text-muted mb-6">
          Masukkan server seed, client seed, dan nonce untuk memverifikasi bahwa hasil taruhan
          tidak dimanipulasi oleh server.
        </p>
        <div className="border border-white/10 rounded-xl p-6">
          <div className="mb-4">
            <label className="block text-sm text-bet-text-muted mb-2">Server Seed</label>
            <input type="text" className="w-full bg-black border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-bet-accent" placeholder="Masukkan server seed (hex)" />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-bet-text-muted mb-2">Client Seed</label>
            <input type="text" className="w-full bg-black border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-bet-accent" placeholder="Masukkan client seed" />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-bet-text-muted mb-2">Nonce</label>
            <input type="number" className="w-full bg-black border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-bet-accent" placeholder="Masukkan nonce" />
          </div>
          <button className="w-full py-3 bg-bet-accent text-bet-dark font-semibold rounded-lg hover:bg-green-400 transition">
            Verifikasi Hasil
          </button>
        </div>
        <div className="mt-8 text-bet-text-muted text-sm">
          <p>Jika hasil cocok dengan riwayat taruhan Anda, game berjalan secara adil.</p>
          <p>Kode verifikasi tersedia di <code className="bg-white/10 px-2 py-1 rounded">@bet/fairness</code>.</p>
        </div>
      </main>
    </div>
  );
}