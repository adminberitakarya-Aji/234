import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { DepositService } from "./deposit.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("deposit")
export class DepositController {
  constructor(private readonly depositService: DepositService) {}

  @UseGuards(JwtAuthGuard)
  @Post("create")
  async create(
    @Request() req: any,
    @Body() body: { currency: string; amount: string },
  ) {
    return this.depositService.createDeposit(
      req.user.userId,
      body.currency,
      BigInt(body.amount),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async getStatus(@Param("id") depositId: string) {
    return this.depositService.getDepositStatus(depositId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("list")
  async list(
    @Request() req: any,
    @Query("limit") limit = 50,
    @Query("offset") offset = 0,
  ) {
    return this.depositService.getUserDeposits(
      req.user.userId,
      Number(limit),
      Number(offset),
    );
  }

  // Internal endpoint for wallet worker to confirm on-chain deposit
  @UseGuards(JwtAuthGuard)
  @Post("confirm")
  async confirm(@Body() body: { depositId: string; txHash: string }) {
    return this.depositService.processDeposit(body.depositId, body.txHash);
  }
}