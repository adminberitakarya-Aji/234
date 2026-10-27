# ADR-001: Spesifikasi Provably Fair (HMAC + Seed Commitment)

## Status
Disetujui — Fase 0

## Konteks
Platform perlu menyediakan hasil game yang dapat diverifikasi oleh pihak ketiga tanpa memerlukan kepercayaan penuh terhadap server. Setiap taruhan harus menghasilkan hasil yang deterministik berdasarkan input yang diketahui sebelum taruhan ditempatkan, namun tidak dapat diprediksi oleh pemain sebelum taruhan dikonfirmasi.

## Keputusan
Hasil game ditentukan melalui konstruksi berikut:

```
result = HMAC_SHA256(server_seed, client_seed || nonce)
```

Di mana:
- `server_seed` — dikonfigurasi server, disimpan dalam bentuk hash (`SHA256(server_seed)`) sebelum ronde dimulai, direveal setelah sesi berakhir
- `client_seed` — ditentukan pemain, dapat diubah kapan saja sebelum taruhan
- `nonce` — integer yang bertambah 1 untuk setiap taruhan dalam sesi yang sama (server_seed + client_seed)

### Komitmen On-Chain (Sumbu A)
Setiap epoch (konfigurabel, default 60 detik), Merkle root dari semua server seed hash dalam epoch tersebut dicatat ke Solana via:
1. Tahap 1: Transaksi Memo (tidak perlu smart contract)
2. Tahap 2: Program Anchor `commit_epoch` dengan PDA

Pemain dapat memverifikasi bahwa seed yang digunakan dalam taruhan mereka cocok dengan komitmen on-chain.

### Format Output
HMAC SHA-256 menghasilkan 32 byte. Untuk game yang membutuhkan angka 0–99.99 (Dice):
1. Ambil 4 byte pertama dari HMAC output
2. Interpretasikan sebagai uint32 big-endian
3. `roll = (value % 10000) / 100` → rentang 0.00–99.99

### Vektor Tes
Vektor tes tetap disimpan di `packages/fairness/vectors.json` dan harus cocok antara server dan halaman verifikasi web (`/verify`). Perubahan pada vektor memerlukan ADR baru dan persetujuan eksplisit.

### Keamanan
- `server_seed` harus dihasilkan menggunakan CSPRNG (crypto.randomBytes di Node.js)
- `server_seed_hash` ditampilkan kepada pemain sebelum taruhan pertama dalam sesi
- `server_seed` asli hanya direveal setelah pemain mengakhiri sesi atau mengganti client_seed
- Tidak ada float dalam perhitungan; semua jumlah uang dalam integer unit terkecil token

## Konsekuensi
- Pemain dapat memverifikasi hasil setiap taruhan secara independen di halaman `/verify`
- Server tidak dapat mengubah hasil setelah `server_seed_hash` ditampilkan
- Pemain juga tidak dapat memprediksi hasil sebelum taruhan karena `server_seed` belum diketahui
- Komitmen on-chain menambah latensi sejumlah epoch, tidak per taruhan

## Lihat Juga
- `packages/fairness/` — implementasi HMAC dan vektor tes
- `packages/chain/` — ChainAdapter untuk komitmen Merkle ke Solana
- PRD bagian 14 (Prinsip desain) dan bagian 17 (Fase 4–5 Sumbu A)