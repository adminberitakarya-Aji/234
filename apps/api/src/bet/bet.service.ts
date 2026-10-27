import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import {
  computeDiceResult,
  createSeedCommitment,
  verifyServerSeed,
} from "@bet/fairness";
import { computeAutoBetRule } from "@bet/dice-rules";
import type {
  FlashBetInput,
  FlashBetOutput,
} from "@bet/shared-types";
import { LedgerService } from "../ledger/ledger.service";
import { UsersService } from "../users/users.service";
import { PrismaService } from "../prisma/prisma.service";
import type { Prisma } from "@prisma/client";


@Injectable()
export class BetService {
  private readonly logger = new Logger(BetService.name);

  constructor(
    private readonly ledgerService: LedgerService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Place a Dice bet.
   * 1. Get or create seed commitment for user session
   * 2. Compute result using provably fair algorithm
   * 3. Record transaction in double-entry ledger
   * 4. Return result with server seed hash (server seed revealed later)
   */
  async placeDiceBet(params: {
    userId: string;
    currency: string;
    amount: bigint;
    targetRoll: number;
    clientSeed: string;
    serverSeed?: string; // existing server seed for continuing session
    serverSeedHash?: string; // existing hash
    nonce?: number;
  }) {
    const user = await this.usersService.findById(params.userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check balance
    const balance = await this.usersService.getBalance(
      params.userId,
      params.currency,
    );
    if (balance < params.amount) {
      throw new BadRequestException("Insufficient balance");
    }

    // Create or use existing seed commitment
    let commitment;
    if (params.serverSeed && params.serverSeedHash && params.nonce !== undefined) {
      // Verify the existing commitment
      const valid = verifyServerSeed(params.serverSeed, params.serverSeedHash);
      if (!valid) {
        throw new BadRequestException("Invalid server seed commitment");
      }
      commitment = {
        serverSeed: params.serverSeed,
        clientSeed: params.clientSeed,
        nonce: params.nonce,
      };
    } else {
      // Create new commitment
      commitment = createSeedCommitment(params.clientSeed);
    }

    const nonce = commitment.nonce || 0;

    // Compute dice result
    const result = computeDiceResult(
      {
        serverSeed: commitment.serverSeed,
        serverSeedHash: "", // will be set below
        clientSeed: commitment.clientSeed,
        nonce,
      },
      nonce,
      {
        targetRoll: params.targetRoll,
        amount: params.amount,
        houseEdge: 100, // 1% house edge
      },
    );

    // Record double-entry transaction
    // Debit: user balance (amount)
    // Credit: house profit (amount - payout) or house loss
    const houseEdge = 100; // 1%
    const effectivePayout = result.won ? result.payout : BigInt(0);
    const houseAmount = params.amount - effectivePayout; // positive = house profit

    await this.ledgerService.recordTransaction([
      {
        userId: params.userId,
        currency: params.currency,
        amount: -params.amount, // debit user
        entryType: "debit",
        referenceType: "bet",
        referenceId: undefined, // will be set after bet creation
      },
      {
        userId: params.userId,
        currency: params.currency,
        amount: effectivePayout, // credit user if won
        entryType: "credit",
        referenceType: "win",
        referenceId: undefined,
      },
      {
        userId: "house",
        currency: params.currency,
        amount: houseAmount, // house takes the edge
        entryType: "credit",
        referenceType: "house_edge",
        referenceId: undefined,
      },
    ]);

    this.logger.log(
      `Dice bet placed: user=${params.userId} amount=${params.amount} target=${params.targetRoll} roll=${result.roll} won=${result.won}`,
    );

    return {
      betId: "pending", // will be replaced with actual bet ID
      nonce: nonce + 1,
      serverSeedHash: commitment.serverSeedHash || "", // commitment hash
      result,
      newBalance: balance - params.amount + effectivePayout,
      houseEdge,
      rakeback: BigInt(0), // flat rakeback = 0 for now
    };
  }

  async getBetHistory(_userId: string, _limit = 50, _offset = 0) {
    // TODO: Fetch from Bet table
    return [];
  }

  async placeFlashDiceBet(params: FlashBetInput): Promise<FlashBetOutput> {
    if (params.count < 1 || params.count > 200) {
      throw new BadRequestException("Count must be between 1 and 200");
    }

    const existing = await this.prisma.betBatch.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
      include: { bets: true },
    });
    if (existing) {
      return this.mapBatchToFlashOutput(existing);
    }

    await this.usersService.findById(params.userId);

    let currentNonce = params.nonce ?? 0;
    let commitment;
    if (params.serverSeed && params.serverSeedHash) {
      const valid = verifyServerSeed(params.serverSeed, params.serverSeedHash);
      if (!valid) {
        throw new BadRequestException("Invalid server seed commitment");
      }
      commitment = {
        serverSeed: params.serverSeed,
        clientSeed: params.clientSeed,
        nonce: currentNonce,
      };
    } else {
      commitment = createSeedCommitment(params.clientSeed);
      currentNonce = 0;
    }

    const rule = params.rule ?? {
      gameType: "dice" as const,
      baseBet: params.betAmount,
      maxBet: params.betAmount,
      stopLoss: BigInt(0),
      stopWin: BigInt(0),
      maxRounds: params.count,
      onWin: "reset",
      onLoss: "reset",
    };

    const balance = await this.usersService.getBalance(
      params.userId,
      params.currency,
    );
    const houseEdge = 100;

    let netResult = BigInt(0);
    let totalStake = BigInt(0);
    let totalPayout = BigInt(0);
    let betsPlaced = 0;
    let stopReason: string | null = null;
    const betResults: Array<{
      nonce: number;
      roll: number;
      won: boolean;
      stake: bigint;
      payout: bigint;
    }> = [];
    let nextBet = params.betAmount;
    let runningBalance = balance;

    for (let i = 0; i < params.count; i++) {
      const stake = i === 0 ? params.betAmount : nextBet;

      if (stake > rule.maxBet) {
        stopReason = "max_bet_reached";
        break;
      }
      if (runningBalance < stake) {
        stopReason = "insufficient_balance";
        break;
      }

      const result = computeDiceResult(
        {
          serverSeed: commitment.serverSeed,
          serverSeedHash: "",
          clientSeed: commitment.clientSeed,
          nonce: currentNonce + i,
        },
        currentNonce + i,
        {
          targetRoll: params.targetRoll,
          amount: stake,
          houseEdge,
        }
      );

      const effectivePayout = result.won ? result.payout : BigInt(0);
      totalStake += stake;
      totalPayout += effectivePayout;
      netResult += effectivePayout - stake;
      runningBalance = runningBalance - stake + effectivePayout;
      betsPlaced++;

      betResults.push({
        nonce: currentNonce + i,
        roll: result.roll,
        won: result.won,
        stake,
        payout: effectivePayout,
      });

      if (i < params.count - 1) {
        const ruleResult = computeAutoBetRule(
          rule,
          i + 1,
          netResult,
          result.won,
        );
        if (!ruleResult.shouldContinue) {
          stopReason = ruleResult.reason;
          break;
        }
        nextBet = ruleResult.nextBet;
      }
    }

    const nonceStart = currentNonce;
    const nonceEnd = nonceStart + betsPlaced;

    const batch = await this.prisma.$transaction(async (tx) => {
      const betBatch = await tx.betBatch.create({
        data: {
          userId: params.userId,
          mode: "flash",
          betCount: betsPlaced,
          totalStake,
          totalPayout,
          nonceStart,
          nonceEnd,
          stopReason,
          rule: params.rule
            ? (JSON.parse(JSON.stringify(params.rule)) as unknown as Prisma.InputJsonValue)
            : undefined,
          idempotencyKey: params.idempotencyKey,
        },
      });

      for (const br of betResults) {
        const resultJson: Prisma.InputJsonValue = {
          gameType: "dice",
          roll: br.roll,
          won: br.won,
          payout: Number(br.payout),
          multiplier: br.won ? 1 / (br.roll / 100) : 0,
          targetRoll: params.targetRoll,
        };
        await tx.bet.create({
          data: {
            userId: params.userId,
            gameType: "dice",
            currency: params.currency,
            amount: br.stake,
            payout: br.payout,
            houseEdge,
            clientSeed: params.clientSeed,
            serverSeed: commitment.serverSeed,
            nonce: br.nonce,
            resultJson,
            batchId: betBatch.id,
          },
        });
      }

      const houseAmount = totalStake - totalPayout;

      const userBal = await tx.balance.findUnique({
        where: {
          userId_currency: { userId: params.userId, currency: params.currency },
        },
      });
      const afterDebit = (userBal?.balance ?? BigInt(0)) - totalStake;
      if (afterDebit < BigInt(0)) {
        throw new BadRequestException("Insufficient balance");
      }
      await tx.balance.upsert({
        where: {
          userId_currency: { userId: params.userId, currency: params.currency },
        },
        update: { balance: afterDebit },
        create: {
          userId: params.userId,
          currency: params.currency,
          balance: afterDebit,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          transactionId: betBatch.id,
          userId: params.userId,
          currency: params.currency,
          amount: -totalStake,
          balanceAfter: afterDebit,
          entryType: "debit",
          referenceType: "bet",
          referenceId: null,
        },
      });

      if (totalPayout > BigInt(0)) {
        const afterCredit = afterDebit + totalPayout;
        await tx.balance.upsert({
          where: {
            userId_currency: { userId: params.userId, currency: params.currency },
          },
          update: { balance: afterCredit },
          create: {
            userId: params.userId,
            currency: params.currency,
            balance: afterCredit,
          },
        });
        await tx.ledgerEntry.create({
          data: {
            transactionId: betBatch.id,
            userId: params.userId,
            currency: params.currency,
            amount: totalPayout,
            balanceAfter: afterCredit,
            entryType: "credit",
            referenceType: "win",
            referenceId: null,
          },
        });
      }

      if (houseAmount > BigInt(0)) {
        const houseBal = await tx.balance.findUnique({
          where: {
            userId_currency: { userId: "house", currency: params.currency },
          },
        });
        const afterHouse = (houseBal?.balance ?? BigInt(0)) + houseAmount;
        await tx.balance.upsert({
          where: {
            userId_currency: { userId: "house", currency: params.currency },
          },
          update: { balance: afterHouse },
          create: {
            userId: "house",
            currency: params.currency,
            balance: afterHouse,
          },
        });
        await tx.ledgerEntry.create({
          data: {
            transactionId: betBatch.id,
            userId: "house",
            currency: params.currency,
            amount: houseAmount,
            balanceAfter: afterHouse,
            entryType: "credit",
            referenceType: "house_edge",
            referenceId: null,
          },
        });
      }

      return betBatch;
    });

    this.logger.log(
      `Flash dice batch: user=${params.userId} batch=${batch.id} count=${betsPlaced} stake=${totalStake} payout=${totalPayout}`,
    );

    return {
      batchId: batch.id,
      mode: "flash",
      betCount: betsPlaced,
      totalStake,
      totalPayout,
      nonceStart,
      nonceEnd,
      stopReason,
      finalBalance: balance - totalStake + totalPayout,
      bets: betResults.map((br) => ({
        nonce: br.nonce,
        roll: br.roll,
        won: br.won,
        stake: br.stake,
        payout: br.payout,
      })),
    };
  }

  private mapBatchToFlashOutput(batch: Prisma.BetBatchGetPayload<{
    include: { bets: true };
  }>): FlashBetOutput {
    return {
      batchId: batch.id,
      mode: "flash",
      betCount: batch.betCount,
      totalStake: batch.totalStake,
      totalPayout: batch.totalPayout,
      nonceStart: batch.nonceStart,
      nonceEnd: batch.nonceEnd,
      stopReason: batch.stopReason,
      finalBalance: BigInt(0),
      bets: batch.bets.map((b) => {
        const rj = b.resultJson as { roll: number; won: boolean } | null;
        return {
          nonce: b.nonce,
          roll: rj?.roll ?? 0,
          won: rj?.won ?? false,
          stake: b.amount,
          payout: b.payout,
        };
      }),
    };
  }
}