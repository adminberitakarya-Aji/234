#!/usr/bin/env node
/**
 * RTP Simulation for Dice - 10 Million Bets
 *
 * Standalone script to verify the house edge is correctly applied
 * before Flash is considered complete (Fase 3 gate).
 *
 * Usage: node rtp-sim-10m.js
 *
 * Expected results:
 *   - targetRoll = 50, houseEdge = 1% (100 bps)
 *   - Multiplier = (1 - 0.01) / 0.50 = 1.98x
 *   - RTP ≈ 99% (house keeps 1% edge)
 *   - RTP must be strictly below 100%
 */
const crypto = require("crypto");

function hmacSha256(key, message) {
  return crypto.createHmac("sha256", key).update(message).digest();
}

function hmacToRollFloat(hmac) {
  const value = hmac.readUInt32BE(0);
  return (value / 0xffffffff) * 100;
}

const serverSeed = crypto.randomBytes(32).toString("hex");
const clientSeed = "rtp_sim_10m";

const targetRoll = 50; // 50% win probability
const houseEdge = 100; // 1% in basis points
const betAmount = 1_000_000n; // 1 unit (8 decimals)
const numBets = 10_000_000; // 10 million

let totalWagered = BigInt(0);
let totalPayout = BigInt(0);
let wins = 0;
let losses = 0;

console.log(`Starting RTP simulation: ${numBets.toLocaleString()} bets...`);
console.log(`Target roll: ${targetRoll}, House edge: ${houseEdge / 100}%`);
console.log(`Expected multiplier: ${((1 - houseEdge / 10000) / (targetRoll / 100)).toFixed(4)}x`);
console.log(`Expected RTP: 99.0000%`);
console.log("");

const start = Date.now();

for (let i = 0; i < numBets; i++) {
  const message = `${clientSeed}:${i}:0`;
  const hmac = hmacSha256(Buffer.from(serverSeed, "hex"), Buffer.from(message, "utf8"));
  const roll = hmacToRollFloat(hmac);
  const won = roll <= targetRoll;
  const probability = targetRoll / 100;
  const multiplier = won ? (1 - houseEdge / 10000) / probability : 0;
  const payout = won ? BigInt(Math.floor(Number(betAmount) * multiplier)) : BigInt(0n);

  totalWagered += betAmount;
  totalPayout += payout;
  if (won) wins++; else losses++;
}

const elapsed = Date.now() - start;
const rtp = Number(totalPayout) / Number(totalWagered);
const expectedMultiplier = (1 - houseEdge / 10000) / (targetRoll / 100);
const expectedRTP = expectedMultiplier * (targetRoll / 100);

console.log("=== Dice RTP Simulation Results (10M bets) ===");
console.log(`Bets:        ${numBets.toLocaleString()}`);
console.log(`Wins:        ${wins.toLocaleString()} (${((wins / numBets) * 100).toFixed(4)}%)`);
console.log(`Losses:      ${losses.toLocaleString()} (${((losses / numBets) * 100).toFixed(4)}%)`);
console.log(`Total wagered: ${totalWagered.toString()}`);
console.log(`Total payout:  ${totalPayout.toString()}`);
console.log(`Actual RTP:    ${(rtp * 100).toFixed(4)}%`);
console.log(`Expected RTP:  ${(expectedRTP * 100).toFixed(4)}%`);
console.log(`House edge:    ${((1 - rtp) * 100).toFixed(4)}%`);
console.log(`Multiplier:    ${expectedMultiplier.toFixed(4)}x`);
console.log(`Elapsed:       ${elapsed}ms`);
console.log(`Rate:          ${Math.round(numBets / (elapsed / 1000)).toLocaleString()} bets/sec`);
console.log("");

if (rtp >= 1.0) {
  console.error("CRITICAL BUG: RTP >= 100%! House is losing systematically!");
  process.exit(1);
} else {
  console.log("PASS: RTP < 100% — house edge correctly applied.");
  process.exit(0);
}
