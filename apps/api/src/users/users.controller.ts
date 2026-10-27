import { Controller, Get, Query, UseGuards, Request, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get("balance")
  async getBalance(
    @Request() req: any,
    @Query("userId") userId: string,
    @Query("currency") currency: string,
  ) {
    // Only allow users to query their own balance (or operators)
    if (req.user.userId !== userId && req.user.role !== "operator") {
      throw new UnauthorizedException("Cannot query another user's balance");
    }
    const balance = await this.usersService.getBalance(userId, currency);
    return { success: true, userId, currency, balance: balance.toString() };
  }
}