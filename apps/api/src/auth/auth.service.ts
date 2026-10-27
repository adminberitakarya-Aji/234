import {
  Injectable,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import type { AuthSession } from "@bet/shared-types";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Verify Solana wallet signature and create/update user session.
   * Expects a signed message from the wallet containing the wallet address + timestamp.
   */
  async verifyWalletSignature(
    walletAddress: string,
    _signature: string,
    _message: string,
  ): Promise<AuthSession> {
    // TODO: Implement actual Solana signature verification using @solana/web3.js
    // For now, accept any signature for devnet experimentation
    this.logger.log(`Verifying wallet signature for ${walletAddress}`);

    let user = await this.usersService.findByWallet(walletAddress);
    if (!user) {
      user = await this.usersService.create({
        walletAddress,
        email: undefined,
      });
    }

    const payload = {
      sub: user.id,
      walletAddress: user.walletAddress,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: "7d",
    });

    return {
      userId: user.id,
      walletAddress: user.walletAddress,
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  async validateUser(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    return user;
  }
}