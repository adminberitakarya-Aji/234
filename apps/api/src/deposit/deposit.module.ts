import { Module } from "@nestjs/common";
import { DepositService } from "./deposit.service";
import { DepositController } from "./deposit.controller";
import { UsersModule } from "../users/users.module";
import { LedgerModule } from "../ledger/ledger.module";

@Module({
  imports: [UsersModule, LedgerModule],
  providers: [DepositService],
  controllers: [DepositController],
  exports: [DepositService],
})
export class DepositModule {}