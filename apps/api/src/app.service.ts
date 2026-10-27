import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  health() {
    return { status: "ok", service: "bet-api", timestamp: new Date().toISOString() };
  }
}