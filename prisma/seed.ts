import { PrismaClient, RaffleChain } from "@prisma/client";
import { encryptGatePassword } from "../src/lib/auth/gate-crypto";
import { ensurePasswordWordPoolSeeded } from "../src/lib/raffles/password-pool";

const prisma = new PrismaClient();

const COLLECTIONS: Array<{
  name: string;
  contractAddress: string;
  chain: RaffleChain;
}> = [
  {
    name: "DeltaSauce Genesis",
    contractAddress: "0x0000000000000000000000000000000000000001",
    chain: RaffleChain.ETHEREUM,
  },
  {
    name: "Mentograph by pho",
    contractAddress: "0x0000000000000000000000000000000000000002",
    chain: RaffleChain.ETHEREUM,
  },
];

async function main() {
  for (const c of COLLECTIONS) {
    await prisma.collection.upsert({
      where: {
        contractAddress_chain: {
          contractAddress: c.contractAddress,
          chain: c.chain,
        },
      },
      update: { name: c.name },
      create: c,
    });
  }
  console.log(`Seeded ${COLLECTIONS.length} collections`);

  const gatePassword = process.env.RAFFLE_GATE_PASSWORD?.trim();
  if (gatePassword) {
    await prisma.platformGate.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        passwordEnc: encryptGatePassword(gatePassword),
      },
      update: {
        passwordEnc: encryptGatePassword(gatePassword),
        passwordUpdatedAt: new Date(),
      },
    });
    console.log("Seeded raffle gate password from RAFFLE_GATE_PASSWORD");
  }

  await ensurePasswordWordPoolSeeded();
  const wordCount = await prisma.rafflePasswordWord.count();
  console.log(`Seeded ${wordCount} raffle password dictionary words`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
