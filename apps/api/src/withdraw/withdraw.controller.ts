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
import { WithdrawService } from "./withdraw.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("withdraw")
export class WithdrawController {
  constructor(private readonly withdrawService: WithdrawService) {}

  @UseGuards(JwtAuthGuard)
  @Post("request")
  async request(
    @Request() req: any,
    @Body() body: {
      currency: string;
      amount: string;
      destinationAddress: string;
    },
  ) {
    return this.withdrawService.requestWithdraw({
      userId: req.user.userId,
      currency: body.currency,
      amount: BigInt(body.amount),
      destinationAddress: body.destinationAddress,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async getStatus(@Param("id") withdrawId: string) {
    return this.withdrawService.getWithdrawStatus(withdrawId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("list")
  async list(
    @Request() req: any,
    @Query("limit") limit = 50,
    @Query("offset") offset = 0,
  ) {
    return this.withdrawService.getUserWithdraws(
      req.user.userId,
      Number(limit),
      Number(offset),
    );
  }

  // Internal endpoints for wallet worker
  @UseGuards(JwtAuthGuard)
  @Post("pending")
  async getPending() {
    return this.withdrawService.getPendingWithdraws();
  }

  @UseGuards(JwtAuthGuard)
  @Post("complete")
  async complete(@Body() body: { withdrawId: string; txHash: string }) {
    return this.withdrawService.completeWithdraw(body.withdrawId, body.txHash);
  }

  @UseGuards(JwtAuthGuard)
  @Post("reject")
  async reject(@Body() body: { withdrawId: string; reason: string }) {
    return this.withdrawService.rejectWithdraw(body.withdrawId, body.reason);
  }
}