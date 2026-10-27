import {
  Injectable,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import type { AuthSession } from "@bet/shared-types";
import { PublicKey } from "@solana/web3.js";
import { createHash, verify } from "crypto";

interface NonceRecord {
  nonce: string;
  usedAt: Date;
}

// In-memory nonce store (single-use nonces for signature replay protection).
// In production this should be backed by Redis with TTL.
const usedNonces = new Map<string, NonceRecord>();
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cleanupNonces() {
  const now = Date.now();
  for (const [key, record] of usedNonces.entries()) {
    if (now - record.usedAt.getTime() > NONCE_TTL_MS) {
      usedNonces.delete(key);
    }
  }
}

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
   * Signature must be ed25519 over the message bytes; nonce must be single-use.
   *
   * Uses @solana/web3.js TweetNaCl for proper ed25519 verification:
   * - Wallet address is parsed as base58-encoded Solana public key
   * - Signature is verified against the message bytes using the public key
   */
  async verifyWalletSignature(
    walletAddress: string,
    signature: string,
    message: string,
  ): Promise<AuthSession> {
    this.logger.log(`Verifying wallet signature for ${walletAddress}`);

    // Reject missing signature or message
    if (!signature || !message) {
      throw new UnauthorizedException("Signature and message are required");
    }

    // Replay protection: nonce must be single-use
    const nonceHash = createHash("sha256").update(`${walletAddress}:${message}`).digest("hex");
    cleanupNonces();
    if (usedNonces.has(nonceHash)) {
      throw new UnauthorizedException("Nonce already used");
    }
    usedNonces.set(nonceHash, { nonce: nonceHash, usedAt: new Date() });

    // Parse wallet address as base58-encoded Solana public key
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(walletAddress);
    } catch {
      throw new UnauthorizedException("Invalid wallet address format");
    }

    // Decode signature from base64
    let signatureBuffer: Uint8Array;
    try {
      signatureBuffer = Uint8Array.from(Buffer.from(signature, "base64"));
    } catch {
      throw new UnauthorizedException("Invalid signature encoding");
    }

    // Verify ed25519 signature using Node.js crypto (same as @solana/web3.js internally)
    const messageBuffer = Buffer.from(message, "utf8");
    const publicKeyBytes = Buffer.from(publicKey.toBytes());

    const isValid = verify(
      "ed25519",
      messageBuffer,
      publicKeyBytes,
      signatureBuffer,
    );

    if (!isValid) {
      throw new UnauthorizedException("Invalid wallet signature");
    }

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