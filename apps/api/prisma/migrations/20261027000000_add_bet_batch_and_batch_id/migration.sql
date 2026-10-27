-- CreateTable: BetBatch
CREATE TABLE "BetBatch" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "mode" TEXT NOT NULL,
    "betCount" INTEGER NOT NULL,
    "totalStake" BIGINT NOT NULL,
    "totalPayout" BIGINT NOT NULL,
    "nonceStart" INTEGER NOT NULL,
    "nonceEnd" INTEGER NOT NULL,
    "stopReason" TEXT,
    "rule" JSON,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BetBatch_pkey" PRIMARY KEY ("id")
);

-- AddColumn: batchId to Bet
ALTER TABLE "Bet" ADD COLUMN "batchId" UUID;

-- AddForeignKey: BetBatch.userId -> User.id
ALTER TABLE "BetBatch" ADD CONSTRAINT "BetBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Bet.batchId -> BetBatch.id
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BetBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: unique idempotencyKey on BetBatch
CREATE UNIQUE INDEX "BetBatch_idempotencyKey_key" ON "BetBatch"("idempotencyKey");
