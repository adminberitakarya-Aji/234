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
export class DepositService {
  private readonly logger = new Logger(DepositService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Create a pending deposit record.
   * Returns the deposit address and expected amount for the user to send to.
   */
  async createDeposit(userId: string, currency: string, amount: bigint) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // TODO: Generate unique deposit address per user/currency from hot wallet system
    const depositAddress = `devnet_deposit_${userId}_${currency}`;

    const deposit = await this.prisma.transaction.create({
      data: {
        userId,
        type: "deposit",
        currency,
        amount,
        status: "pending",
      },
    });

    this.logger.log(
      `Deposit created: id=${deposit.id} user=${userId} currency=${currency} amount=${amount.toString()}`,
    );

    return {
      depositId: deposit.id,
      depositAddress,
      amount: amount.toString(),
      currency,
      status: "pending",
    };
  }

  /**
   * Process an on-chain deposit notification (called by wallet worker).
   * Credits the user's balance via double-entry ledger.
   */
  async processDeposit(depositId: string, txHash: string) {
    return this.prisma.$transaction(async (tx) => {
      const deposit = await tx.transaction.findUnique({
        where: { id: depositId },
      });

      if (!deposit) {
        throw new NotFoundException("Deposit not found");
      }

      if (deposit.status !== "pending") {
        throw new BadRequestException("Deposit already processed");
      }

      // Mark as completed
      await tx.transaction.update({
        where: { id: depositId },
        data: { status: "completed", txHash },
      });

      // Credit user balance via ledger (double-entry)
      await this.ledgerService.recordTransaction([
        {
          userId: deposit.userId,
          currency: deposit.currency,
          amount: deposit.amount, // credit user
          entryType: "credit",
          referenceType: "deposit",
          referenceId: depositId,
        },
        {
          userId: "house",
          currency: deposit.currency,
          amount: -deposit.amount, // debit house (source of funds)
          entryType: "debit",
          referenceType: "deposit",
          referenceId: depositId,
        },
      ]);

      this.logger.log(`Deposit processed: id=${depositId} txHash=${txHash}`);

      return { success: true, depositId, status: "completed" };
    });
  }

  async getDepositStatus(depositId: string) {
    const deposit = await this.prisma.transaction.findUnique({
      where: { id: depositId },
    });
    if (!deposit) {
      throw new NotFoundException("Deposit not found");
    }
    return deposit;
  }

  async getUserDeposits(userId: string, limit = 50, offset = 0) {
    return this.prisma.transaction.findMany({
      where: { userId, type: "deposit" },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }
}