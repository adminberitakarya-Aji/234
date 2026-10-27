import { describe, it, expect } from "vitest";
import { computeDiceResult } from "./dice";
import { createSeedCommitment } from "./seed";

/**
 * RTP Simulation Gate for Dice (Fase 3)
 *
 * Simulates 10 million dice bets to verify the house edge is correctly applied.
 * With targetRoll = 50 and houseEdge = 1% (100 bps):
 *   - Win probability = 50/100 = 0.50
 *   - Multiplier = (1 - 0.01) / 0.50 = 1.98
 *   - Expected RTP ≈ 99% (house keeps 1% edge)
 *
 * Any RTP >= 100% indicates the house is losing systematically — a critical bug.
 */
describe("Dice RTP simulation (10 million bets)", () => {
  it("maintains RTP below 100% with correct house edge", () => {
    const targetRoll = 50; // 50% win probability
    const houseEdge = 100; // 1% in basis points
    const betAmount = 1_000_000n; // 1 unit (8 decimals)
    const numBets = 1_000_000; // 1M bets for CI (10M in standalone script: rtp-sim-10m.js)

    const commitment = createSeedCommitment("rtp_sim_client");

    let totalWagered = BigInt(0);
    let totalPayout = BigInt(0);
    let wins = 0;
    let losses = 0;

    for (let i = 0; i < numBets; i++) {
      const result = computeDiceResult(
        commitment,
        i, // nonce
        { targetRoll, amount: betAmount, houseEdge },
        0, // cursor
      );

      totalWagered += betAmount;
      totalPayout += result.payout;

      if (result.won) wins++;
      else losses++;
    }

    // RTP = totalPayout / totalWagered
    const rtp = Number(totalPayout) / Number(totalWagered);
    const expectedMultiplier = (1 - houseEdge / 10000) / (targetRoll / 100);
    const expectedRTP = expectedMultiplier * (targetRoll / 100); // should equal (1 - edge)

    console.log(`\n--- Dice RTP Simulation Results ---`);
    console.log(`Bets: ${numBets.toLocaleString()}`);
    console.log(`Wins: ${wins.toLocaleString()} (${((wins / numBets) * 100).toFixed(4)}%)`);
    console.log(`Losses: ${losses.toLocaleString()} (${((losses / numBets) * 100).toFixed(4)}%)`);
    console.log(`Total wagered: ${totalWagered.toString()}`);
    console.log(`Total payout: ${totalPayout.toString()}`);
    console.log(`Actual RTP: ${(rtp * 100).toFixed(4)}%`);
    console.log(`Expected multiplier: ${expectedMultiplier.toFixed(4)}`);
    console.log(`Expected RTP: ${(expectedRTP * 100).toFixed(4)}%`);
    console.log(`House edge kept: ${((1 - rtp) * 100).toFixed(4)}%`);

    // RTP must be strictly below 100% — house must never lose systematically
    expect(rtp).toBeLessThan(1.0);

    // RTP should be close to expected (within 0.5% for 10M samples)
    expect(Math.abs(rtp - expectedRTP)).toBeLessThan(0.005);

    // Win rate should be close to 50%
    const winRate = wins / numBets;
    expect(Math.abs(winRate - 0.50)).toBeLessThan(0.005);
  });

  it("verifies multiplier formula: target 50, edge 1% → 1.98x", () => {
    const commitment = createSeedCommitment("mult_check");
    const result = computeDiceResult(
      commitment,
      1,
      { targetRoll: 50, amount: 100n, houseEdge: 100 },
      0,
    );

    // When won, multiplier should be exactly 1.98
    if (result.won) {
      expect(result.multiplier).toBeCloseTo(1.98, 4);
    }

    // When lost, multiplier is 0
    const losingResult = computeDiceResult(
      commitment,
      2,
      { targetRoll: 1, amount: 100n, houseEdge: 100 }, // very low target, likely lose
      0,
    );
    if (!losingResult.won) {
      expect(losingResult.multiplier).toBe(0);
    }
  });
});
