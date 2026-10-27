import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  Query,
} from "@nestjs/common";
import { BetService } from "./bet.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { Currency } from "@bet/shared-types";

@Controller("bet")
export class BetController {
  constructor(private readonly betService: BetService) {}

  @UseGuards(JwtAuthGuard)
  @Post("dice")
  async placeDice(@Request() req: any, @Body() body: {
    currency: string;
    amount: string;
    targetRoll: number;
    clientSeed: string;
    serverSeed?: string;
    serverSeedHash?: string;
    nonce?: number;
  }) {
    return this.betService.placeDiceBet({
      userId: req.user.userId,
      currency: body.currency,
      amount: BigInt(body.amount),
      targetRoll: body.targetRoll,
      clientSeed: body.clientSeed,
      serverSeed: body.serverSeed,
      serverSeedHash: body.serverSeedHash,
      nonce: body.nonce,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get("history")
  async getHistory(
    @Request() req: any,
    @Query("limit") limit = 50,
    @Query("offset") offset = 0,
  ) {
    return this.betService.getBetHistory(req.user.userId, Number(limit), Number(offset));
  }

  @UseGuards(JwtAuthGuard)
  @Post("dice/flash")
  async placeFlashDice(
    @Request() req: any,
    @Body() body: {
      currency: string;
      betAmount: string;
      count: number;
      targetRoll: number;
      clientSeed: string;
      serverSeed?: string;
      serverSeedHash?: string;
      nonce?: number;
      idempotencyKey: string;
      rule?: {
        baseBet: string;
        maxBet: string;
        stopLoss: string;
        stopWin: string;
        maxRounds: number;
        onWin: "reset" | "paroli" | "martingale";
        onLoss: "reset" | "paroli" | "martingale";
      };
    },
  ) {
    return this.betService.placeFlashDiceBet({
      userId: req.user.userId,
      currency: body.currency as Currency,
      betAmount: BigInt(body.betAmount),
      count: body.count,
      targetRoll: body.targetRoll,
      clientSeed: body.clientSeed,
      serverSeed: body.serverSeed,
      serverSeedHash: body.serverSeedHash,
      nonce: body.nonce,
      idempotencyKey: body.idempotencyKey,
      rule: body.rule
        ? {
            gameType: "dice" as const,
            baseBet: BigInt(body.rule.baseBet),
            maxBet: BigInt(body.rule.maxBet),
            stopLoss: BigInt(body.rule.stopLoss),
            stopWin: BigInt(body.rule.stopWin),
            maxRounds: body.rule.maxRounds,
            onWin: body.rule.onWin,
            onLoss: body.rule.onLoss,
          }
        : undefined,
    });
  }
}