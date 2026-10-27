-- CreateTable: Seed
-- Server-managed seed commitments for provably fair betting.
-- Each user has one active seed; nonce is managed server-side (never client-controlled).
CREATE TABLE "Seed" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "serverSeed" TEXT NOT NULL,
    "serverSeedHash" TEXT NOT NULL,
    "clientSeed" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seed_pkey" PRIMARY KEY ("id")
);

-- Unique index on serverSeedHash (commitment must be unique)
CREATE UNIQUE INDEX "Seed_serverSeedHash_key" ON "Seed"("serverSeedHash");

-- Index for fast lookup by userId (active seed lookup per bet)
CREATE INDEX "Seed_userId_idx" ON "Seed"("userId");

-- AddForeignKey: Seed.userId -> User.id
ALTER TABLE "Seed" ADD CONSTRAINT "Seed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
