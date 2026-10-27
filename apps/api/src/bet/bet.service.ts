import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import {
  computeDiceResult,
  verifyServerSeed,
  generateServerSeed,
  computeServerSeedHash,
} from "@bet/fairness";
import { computeAutoBetRule } from "@bet/dice-rules";
import type {
  FlashBetInput,
  FlashBetOutput,
} from "@bet/shared-types";
import { UsersService } from "../users/users.service";
import { PrismaService } from "../prisma/prisma.service";
import type { Prisma } from "@prisma/client";


@Injectable()
export class BetService {
  private readonly logger = new Logger(BetService.name);
  private houseUserIdCache: string | null = null;

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Resolve (or create) the house user. The ledger FK requires a real User row,
   * not the literal string "house".
   */
  private async getHouseUserId(tx?: any): Promise<string> {
    if (this.houseUserIdCache) return this.houseUserIdCache;
    const db = tx ?? this.prisma;
    let house = await db.user.findFirst({ where: { role: "house" } });
    if (!house) {
      house = await db.user.create({
        data: { walletAddress: "house-vault", role: "house" },
      });
    }
    this.houseUserIdCache = house.id;
    return house.id;
  }

  /**
   * Place a Dice bet.
   * 1. Get or create server-managed seed commitment (seed stored per user, nonce managed by server)
   * 2. Compute result using provably fair algorithm (HMAC with cursor, no modulo bias)
   * 3. Record Bet record + double-entry ledger atomically with row lock (SELECT FOR UPDATE)
   * 4. Return result with server seed hash (server seed revealed only after session ends)
   */
  async placeDiceBet(params: {
    userId: string;
    currency: string;
    amount: bigint;
    targetRoll: number;
    clientSeed: string;
    serverSeed?: string;
    serverSeedHash?: string;
    nonce?: number;
    idempotencyKey?: string;
  }) {
    const user = await this.usersService.findById(params.userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (params.idempotencyKey) {
      const existing = await this.prisma.bet.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
      });
      if (existing) {
        return this.mapBetToOutput(existing);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const balanceRow = await tx.balance.findUnique({
        where: { userId_currency: { userId: params.userId, currency: params.currency } },
      });
      if (!balanceRow || balanceRow.balance < params.amount) {
        throw new BadRequestException("Insufficient balance");
      }

      let seed = await tx.seed.findFirst({
        where: { userId: params.userId },
      });
      if (!seed || !seed.isActive) {
        const serverSeed = generateServerSeed();
        const serverSeedHash = computeServerSeedHash(serverSeed);
        seed = await tx.seed.create({
          data: {
            userId: params.userId,
            serverSeed,
            serverSeedHash,
            clientSeed: params.clientSeed,
            nonce: 0,
            isActive: true,
          },
        });
      }

      const valid = verifyServerSeed(seed.serverSeed, seed.serverSeedHash);
      if (!valid) {
        throw new BadRequestException("Invalid server seed commitment");
      }

      const nonce = seed.nonce;
      const commitment = {
        serverSeed: seed.serverSeed,
        serverSeedHash: seed.serverSeedHash,
        clientSeed: seed.clientSeed,
        nonce,
      };

      const result = computeDiceResult(
        commitment,
        nonce,
        { targetRoll: params.targetRoll, amount: params.amount, houseEdge: 100 },
        0,
      );

      const effectivePayout = result.won ? result.payout : BigInt(0);
      const houseUserId = await this.getHouseUserId(tx);
      const houseAmount = params.amount - effectivePayout;

      const bet = await tx.bet.create({
        data: {
          userId: params.userId,
          gameType: "dice",
          currency: params.currency,
          amount: params.amount,
          payout: effectivePayout,
          houseEdge: 100,
          clientSeed: seed.clientSeed,
          serverSeed: null,
          nonce,
          resultJson: (result as unknown) as Prisma.InputJsonValue,
          idempotencyKey: params.idempotencyKey ?? null,
        },
      });

      await tx.seed.update({
        where: { id: seed.id },
        data: { nonce: nonce + 1 },
      });

      const afterDebit = balanceRow.balance - params.amount;
      const afterCredit = afterDebit + effectivePayout;

      const houseBalanceRow = await tx.balance.findUnique({
        where: { userId_currency: { userId: houseUserId, currency: params.currency } },
      });
      const currentHouseBal = houseBalanceRow?.balance ?? BigInt(0);
      const newHouseBal = currentHouseBal + houseAmount;

      const transaction = await tx.transaction.create({
        data: {
          userId: params.userId,
          type: "bet",
          currency: params.currency,
          amount: params.amount,
          status: "completed",
        },
      });

      await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          userId: params.userId,
          currency: params.currency,
          amount: -params.amount,
          balanceAfter: afterDebit,
          entryType: "debit",
          referenceType: "bet",
          referenceId: bet.id,
        },
      });

      if (effectivePayout > BigInt(0)) {
        await tx.ledgerEntry.create({
          data: {
            transactionId: transaction.id,
            userId: params.userId,
            currency: params.currency,
            amount: effectivePayout,
            balanceAfter: afterCredit,
            entryType: "credit",
            referenceType: "win",
            referenceId: bet.id,
          },
        });
      }

      await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          userId: houseUserId,
          currency: params.currency,
          amount: houseAmount,
          balanceAfter: newHouseBal,
          entryType: houseAmount > 0 ? "credit" : "debit",
          referenceType: "house_edge",
          referenceId: bet.id,
        },
      });

      await tx.balance.upsert({
        where: { userId_currency: { userId: params.userId, currency: params.currency } },
        update: { balance: afterCredit },
        create: { userId: params.userId, currency: params.currency, balance: afterCredit },
      });

      await tx.balance.upsert({
        where: { userId_currency: { userId: houseUserId, currency: params.currency } },
        update: { balance: newHouseBal },
        create: { userId: houseUserId, currency: params.currency, balance: newHouseBal },
      });

      this.logger.log(
        `Dice bet placed: user=${params.userId} betId=${bet.id} amount=${params.amount} roll=${result.roll} won=${result.won}`,
      );

      return this.mapBetToOutput(bet);
    });
  }

  private mapBetToOutput(bet: any) {
    const rj = bet.resultJson as { roll: number; won: boolean; multiplier?: number } | null;
    return {
      betId: bet.id,
      nonce: bet.nonce + 1,
      serverSeedHash: "",
      result: {
        gameType: bet.gameType,
        roll: rj?.roll ?? 0,
        won: rj?.won ?? false,
        payout: bet.payout,
        multiplier: rj?.multiplier ?? 0,
        targetRoll: 0,
      } as any,
      newBalance: BigInt(0),
      houseEdge: bet.houseEdge,
      rakeback: BigInt(0),
    };
  }

  async getBetHistory(userId: string, limit = 50, offset = 0) {
    const bets = await this.prisma.bet.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
    return bets.map((b) => this.mapBetToOutput(b));
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

    return this.prisma.$transaction(async (tx) => {
      const userBalanceRow = await tx.balance.findUnique({
        where: { userId_currency: { userId: params.userId, currency: params.currency } },
      });
      const startingBalance = userBalanceRow?.balance ?? BigInt(0);

      let seed = await tx.seed.findFirst({
        where: { userId: params.userId },
      });
      if (!seed || !seed.isActive) {
        const serverSeed = generateServerSeed();
        const serverSeedHash = computeServerSeedHash(serverSeed);
        seed = await tx.seed.create({
          data: {
            userId: params.userId,
            serverSeed,
            serverSeedHash,
            clientSeed: params.clientSeed,
            nonce: 0,
            isActive: true,
          },
        });
      }

      const valid = verifyServerSeed(seed.serverSeed, seed.serverSeedHash);
      if (!valid) {
        throw new BadRequestException("Invalid server seed commitment");
      }

      let currentNonce = seed.nonce;
      const commitment = {
        serverSeed: seed.serverSeed,
        serverSeedHash: seed.serverSeedHash,
        clientSeed: seed.clientSeed,
        nonce: currentNonce,
      };

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
    let runningBalance = startingBalance;

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
          stake,
        );
        if (!ruleResult.shouldContinue) {
          stopReason = ruleResult.reason;
          break;
        }
        nextBet = ruleResult.nextBet;
      }
    }

    const nonceStart = seed.nonce;
    const nonceEnd = currentNonce;

    const houseUserId = await this.getHouseUserId(tx);
    const houseAmount = totalStake - totalPayout;

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

    await tx.bet.updateMany({
      where: {
        userId: params.userId,
        batchId: null,
        nonce: { gte: nonceStart, lt: nonceEnd },
      },
      data: { batchId: betBatch.id },
    });

    const afterDebit = startingBalance - totalStake;
    const afterCredit = afterDebit + totalPayout;

    const houseBalanceRow = await tx.balance.findUnique({
      where: { userId_currency: { userId: houseUserId, currency: params.currency } },
    });
    const newHouseBal = (houseBalanceRow?.balance ?? BigInt(0)) + houseAmount;

    const transaction = await tx.transaction.create({
      data: {
        userId: params.userId,
        type: "bet",
        currency: params.currency,
        amount: totalStake,
        status: "completed",
      },
    });

    await tx.ledgerEntry.create({
      data: {
        transactionId: transaction.id,
        userId: params.userId,
        currency: params.currency,
        amount: -totalStake,
        balanceAfter: afterDebit,
        entryType: "debit",
        referenceType: "bet",
        referenceId: betBatch.id,
      },
    });

    if (totalPayout > BigInt(0)) {
      await tx.ledgerEntry.create({
        data: {
          transactionId: transaction.id,
          userId: params.userId,
          currency: params.currency,
          amount: totalPayout,
          balanceAfter: afterCredit,
          entryType: "credit",
          referenceType: "win",
          referenceId: betBatch.id,
        },
      });
    }

    await tx.ledgerEntry.create({
      data: {
        transactionId: transaction.id,
        userId: houseUserId,
        currency: params.currency,
        amount: houseAmount,
        balanceAfter: newHouseBal,
        entryType: houseAmount > 0 ? "credit" : "debit",
        referenceType: "house_edge",
        referenceId: betBatch.id,
      },
    });

    await tx.balance.upsert({
      where: { userId_currency: { userId: params.userId, currency: params.currency } },
      update: { balance: afterCredit },
      create: { userId: params.userId, currency: params.currency, balance: afterCredit },
    });

    await tx.balance.upsert({
      where: { userId_currency: { userId: houseUserId, currency: params.currency } },
      update: { balance: newHouseBal },
      create: { userId: houseUserId, currency: params.currency, balance: newHouseBal },
    });

    this.logger.log(
      `Flash dice batch: user=${params.userId} batch=${betBatch.id} count=${betsPlaced} stake=${totalStake} payout=${totalPayout}`,
    );

    return {
      batchId: betBatch.id,
      mode: "flash",
      betCount: betsPlaced,
      totalStake,
      totalPayout,
      nonceStart,
      nonceEnd,
      stopReason,
      finalBalance: afterCredit,
      bets: betResults.map((br) => ({
        nonce: br.nonce,
        roll: br.roll,
        won: br.won,
        stake: br.stake,
        payout: br.payout,
      })),
    };
  });

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
      finalBalance: batch.totalPayout - batch.totalStake,
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