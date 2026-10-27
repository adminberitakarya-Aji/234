import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LedgerService } from "../ledger/ledger.service";
import { UsersService } from "../users/users.service";

@Injectable()
export class WithdrawService {
  private readonly logger = new Logger(WithdrawService.name);
  private houseUserIdCache: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly usersService: UsersService,
  ) {}

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
   * Request a withdraw. Debits user balance immediately, creates pending withdraw.
   * Wallet worker will pick up and sign the on-chain transaction.
   */
  async requestWithdraw(params: {
    userId: string;
    currency: string;
    amount: bigint;
    destinationAddress: string;
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

    // Create pending withdraw transaction (debit recorded in ledger)
    const withdraw = await this.prisma.transaction.create({
      data: {
        userId: params.userId,
        type: "withdraw",
        currency: params.currency,
        amount: -params.amount, // negative = debit
        status: "pending",
      },
    });

    // Debit user balance via ledger immediately
    await this.ledgerService.recordTransaction([
      {
        userId: params.userId,
        currency: params.currency,
        amount: -params.amount, // debit user
        entryType: "debit",
        referenceType: "withdraw",
        referenceId: withdraw.id,
      },
      {
        userId: await this.getHouseUserId(),
        currency: params.currency,
        amount: params.amount, // credit house (holds funds for withdraw)
        entryType: "credit",
        referenceType: "withdraw",
        referenceId: withdraw.id,
      },
    ]);

    this.logger.log(
      `Withdraw requested: id=${withdraw.id} user=${params.userId} amount=${params.amount.toString()} dest=${params.destinationAddress}`,
    );

    return {
      withdrawId: withdraw.id,
      destinationAddress: params.destinationAddress,
      amount: params.amount.toString(),
      currency: params.currency,
      status: "pending",
    };
  }

  /**
   * Complete a withdraw (called by wallet worker after on-chain confirmation).
   */
  async completeWithdraw(withdrawId: string, txHash: string) {
    return this.prisma.$transaction(async (tx) => {
      const withdraw = await tx.transaction.findUnique({
        where: { id: withdrawId },
      });

      if (!withdraw) {
        throw new NotFoundException("Withdraw not found");
      }

      if (withdraw.status !== "pending") {
        throw new BadRequestException("Withdraw already processed");
      }

      // Mark as completed
      await tx.transaction.update({
        where: { id: withdrawId },
        data: { status: "completed", txHash },
      });

      // Release house hold (debit house, the funds left the platform)
      const houseUserId = await this.getHouseUserId(tx);
      await this.ledgerService.recordTransaction([
        {
          userId: houseUserId,
          currency: withdraw.currency,
          amount: withdraw.amount < 0n ? -withdraw.amount : withdraw.amount, // debit house
          entryType: "debit",
          referenceType: "withdraw",
          referenceId: withdrawId,
        },
      ]);

      this.logger.log(`Withdraw completed: id=${withdrawId} txHash=${txHash}`);

      return { success: true, withdrawId, status: "completed" };
    });
  }

  async rejectWithdraw(withdrawId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const withdraw = await tx.transaction.findUnique({
        where: { id: withdrawId },
      });

      if (!withdraw) {
        throw new NotFoundException("Withdraw not found");
      }

      if (withdraw.status !== "pending") {
        throw new BadRequestException("Withdraw already processed");
      }

      // Mark as rejected
      await tx.transaction.update({
        where: { id: withdrawId },
        data: { status: "rejected" },
      });

      // Reverse the debit: credit user back
      const houseUserId = await this.getHouseUserId(tx);
      await this.ledgerService.recordTransaction([
        {
          userId: withdraw.userId,
          currency: withdraw.currency,
          amount: withdraw.amount < 0n ? -withdraw.amount : withdraw.amount, // credit user back
          entryType: "credit",
          referenceType: "withdraw_reversal",
          referenceId: withdrawId,
        },
        {
          userId: houseUserId,
          currency: withdraw.currency,
          amount: -(withdraw.amount < 0n ? -withdraw.amount : withdraw.amount), // debit house
          entryType: "debit",
          referenceType: "withdraw_reversal",
          referenceId: withdrawId,
        },
      ]);

      this.logger.log(`Withdraw rejected: id=${withdrawId} reason=${reason}`);

      return { success: true, withdrawId, status: "rejected", reason };
    });
  }

  async getWithdrawStatus(withdrawId: string) {
    const withdraw = await this.prisma.transaction.findUnique({
      where: { id: withdrawId },
    });
    if (!withdraw) {
      throw new NotFoundException("Withdraw not found");
    }
    return withdraw;
  }

  async getUserWithdraws(userId: string, limit = 50, offset = 0) {
    return this.prisma.transaction.findMany({
      where: { userId, type: "withdraw" },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  async getPendingWithdraws() {
    return this.prisma.transaction.findMany({
      where: { type: "withdraw", status: "pending" },
      orderBy: { createdAt: "asc" },
    });
  }
}