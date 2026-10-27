import { Module } from "@nestjs/common";
import { BetService } from "./bet.service";
import { BetController } from "./bet.controller";
import { LedgerModule } from "../ledger/ledger.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [LedgerModule, UsersModule],
  providers: [BetService],
  controllers: [BetController],
  exports: [BetService],
})
export class BetModule {}