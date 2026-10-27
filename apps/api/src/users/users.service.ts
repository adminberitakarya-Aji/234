import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByWallet(walletAddress: string) {
    return this.prisma.user.findUnique({
      where: { walletAddress },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async create(data: { walletAddress: string; email?: string }) {
    return this.prisma.user.create({
      data: {
        walletAddress: data.walletAddress,
        email: data.email,
      },
    });
  }

  async getBalance(userId: string, currency: string) {
    const balance = await this.prisma.balance.findUnique({
      where: {
        userId_currency: { userId, currency },
      },
    });
    return balance?.balance ?? BigInt(0);
  }
}