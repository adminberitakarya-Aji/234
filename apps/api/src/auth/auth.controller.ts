import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import type { AuthSession } from "@bet/shared-types";
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(
    @Body() body: { walletAddress: string; signature: string; message: string },
  ): Promise<{ success: boolean; session: AuthSession }> {
    const session = await this.authService.verifyWalletSignature(
      body.walletAddress,
      body.signature,
      body.message,
    );
    return { success: true, session };
  }

  @Post("refresh")
  async refresh(@Body() _body: { refreshToken: string }) {
    return { success: true, message: "Refresh not yet implemented" };
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@Request() req: any) {
    return { success: true, user: req.user };
  }

  @Post("logout")
  async logout(@Body() _body: { userId: string }) {
    return { success: true };
  }
}