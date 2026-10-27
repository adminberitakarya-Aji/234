import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy as any) {
  constructor(config: ConfigService) {
    const secret = config.get("JWT_ACCESS_SECRET");
    if (!secret || secret === "change-me" || secret === "change-me-in-production") {
      throw new Error(
        "JWT_ACCESS_SECRET must be set to a non-default value. Do not use the default secret.",
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    } as any);
  }

  async validate(payload: any) {
    return { userId: payload.sub, walletAddress: payload.walletAddress };
  }
}