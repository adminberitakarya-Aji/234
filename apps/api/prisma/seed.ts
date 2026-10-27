import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create house user (required for ledger FK constraints on house_edge entries)
  const houseUser = await prisma.user.upsert({
    where: { walletAddress: "house-vault" },
    update: {},
    create: {
      walletAddress: "house-vault",
      role: "house",
      email: "house@platform.internal",
      kycStatus: "verified",
    },
  });

  console.log(`House user ensured: id=${houseUser.id} role=${houseUser.role}`);

  // Create initial balance for house user if not exists
  await prisma.balance.upsert({
    where: {
      userId_currency: {
        userId: houseUser.id,
        currency: "USDC",
      },
    },
    update: {},
    create: {
      userId: houseUser.id,
      currency: "USDC",
      balance: 0n,
    },
  });

  console.log(`House balance ensured: userId=${houseUser.id} currency=USDC`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
