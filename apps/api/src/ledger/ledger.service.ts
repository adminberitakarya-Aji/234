import {
  Injectable,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { checkDoubleEntry, checkNoNegativeBalance } from "@bet/ledger";

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a double-entry transaction.
   * entries: array of { userId, currency, amount (positive=credit, negative=debit), entryType, referenceType, referenceId }
   * The sum of all amounts must equal 0.
   */
  async recordTransaction(entries: Array<{
    userId: string;
    currency: string;
    amount: bigint;
    entryType: "debit" | "credit";
    referenceType?: string;
    referenceId?: string;
  }>) {
    const netSum = entries.reduce(
      (acc, e) => acc + e.amount,
      BigInt(0),
    );

    if (netSum !== BigInt(0)) {
      throw new BadRequestException(
        `Transaction entries must sum to 0 (double-entry), got ${netSum.toString()}`,
      );
    }

    // Check double-entry invariant
    const doubleEntryCheck = checkDoubleEntry(
      entries.map((e) => ({ transactionId: "pending", amount: e.amount })),
    );
    if (!doubleEntryCheck.valid) {
      throw new BadRequestException(doubleEntryCheck.errors.join(", "));
    }

    // Check no negative balance after applying entries
    const balanceCheck = checkNoNegativeBalance(
      entries.map((e) => ({
        userId: e.userId,
        currency: e.currency,
        balance: BigInt(0), // placeholder - actual balance computed in transaction
      })),
    );
    if (!balanceCheck.valid) {
      throw new BadRequestException(balanceCheck.errors.join(", "));
    }

    return this.prisma.$transaction(async (tx) => {
      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId: entries[0].userId,
          type: entries[0].referenceType || "manual",
          currency: entries[0].currency,
          amount: entries.filter((e) => e.amount > 0n).reduce((a, b) => a + b.amount, BigInt(0)),
          status: "completed",
        },
      });

      // Create ledger entries
      for (const entry of entries) {
        // Get current balance
        const currentBalance = await tx.balance.findUnique({
          where: {
            userId_currency: { userId: entry.userId, currency: entry.currency },
          },
        });

        const newBalance = (currentBalance?.balance ?? BigInt(0)) + entry.amount;

        // Check negative balance
        if (newBalance < BigInt(0)) {
          throw new BadRequestException(
            `Insufficient balance for user ${entry.userId} currency ${entry.currency}`,
          );
        }

        // Upsert balance
        await tx.balance.upsert({
          where: {
            userId_currency: { userId: entry.userId, currency: entry.currency },
          },
          update: { balance: newBalance },
          create: {
            userId: entry.userId,
            currency: entry.currency,
            balance: newBalance,
          },
        });

        // Create ledger entry
        await tx.ledgerEntry.create({
          data: {
            transactionId: transaction.id,
            userId: entry.userId,
            currency: entry.currency,
            amount: entry.amount,
            balanceAfter: newBalance,
            entryType: entry.entryType,
            referenceType: entry.referenceType,
            referenceId: entry.referenceId ?? null,
          },
        });
      }

      return transaction;
    });
  }

  async getLedgerEntries(userId: string, limit = 50, offset = 0) {
    return this.prisma.ledgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }
}