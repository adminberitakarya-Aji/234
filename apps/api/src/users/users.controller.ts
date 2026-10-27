import { Controller, Get, Query } from "@nestjs/common";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("balance")
  async getBalance(
    @Query("userId") userId: string,
    @Query("currency") currency: string,
  ) {
    const balance = await this.usersService.getBalance(userId, currency);
    return { success: true, userId, currency, balance: balance.toString() };
  }
}