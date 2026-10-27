# Crypto Betting Platform (Solana Devnet)

Platform perjudian crypto eksperimen dengan 4 game klasik: **Dice, Crash, Plinko, Mines**.
Berjalan di **Solana devnet** — token tidak bernilai, tidak ada uang nyata.

## Struktur Monorepo (pnpm workspace)

```
apps/
├── web/            # Next.js: UI game, halaman verifikasi, dashboard pemain
├── api/            # NestJS: auth, game engine, WebSocket, admin API
├── worker/         # BullMQ: rakeback, batching Merkle, job terjadwal
└── wallet/         # Deposit watcher + withdraw signer (proses terpisah)

packages/
├── fairness/       # HMAC, hash chain, fungsi hasil game, vektor tes
├── ledger/         # Skema dan query ledger (SQL langsung), aturan saldo
├── chain/          # Antarmuka ChainAdapter + implementasi Solana
├── shared-types/   # DTO, enum, kontrak API, kode error
├── dice-rules/     # Rule engine auto-bet/flash (fungsi murni)
└── config/         # tsconfig, eslint, prettier bersama

programs/
└── commitment/     # Program Anchor (tahap 2 Sumbu A)

docs/               # PRD, ADR
infra/              # docker-compose, skrip deploy
```

## Fase 0 (Fondasi)

Tujuan: Monorepo, CI, Docker Compose, ADR-001 (spesifikasi fairness).

### Prasyarat
- Node.js >= 20
- pnpm >= 9
- Docker (opsional, untuk stack lokal)

### Instalasi
```bash
cd d:\bet
pnpm install
```

### Stack Lokal (Docker Compose)
```bash
docker compose up
```
Menjalankan: PostgreSQL (5432), Redis (6379), Solana Test Validator (8899).

### CI
GitHub Actions menjalankan lint, typecheck, unit tests, dan build check.

## ADR-001: Provably Fair

Lihat `docs/ADR-001-fairness.md` untuk spesifikasi lengkap HMAC, seed commitment, dan Merkle root komitmen on-chain.

## Roadmap (PRD)

Lihat `docs/PRD.md` untuk roadmap 8 fase (sekitar 19 minggu kerja penuh, ±30% dengan 20 jam/minggu).

## Peringatan Hukum

Ini adalah eksperimen teknis di devnet dengan token tanpa nilai. Tidak ada pengguna publik dan tidak ada uang nyata. Jika beralih ke dana nyata atau pengguna publik, proyek harus berhenti dan melalui tinjauan hukum terlebih dahulu (lihat PRD bagian 18).