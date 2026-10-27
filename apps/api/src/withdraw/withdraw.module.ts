import { Module } from "@nestjs/common";
import { WithdrawService } from "./withdraw.service";
import { WithdrawController } from "./withdraw.controller";
import { UsersModule } from "../users/users.module";
import { LedgerModule } from "../ledger/ledger.module";

@Module({
  imports: [UsersModule, LedgerModule],
  providers: [WithdrawService],
  controllers: [WithdrawController],
  exports: [WithdrawService],
})
export class WithdrawModule {}