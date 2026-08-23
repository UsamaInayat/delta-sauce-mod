import { PrismaClient, RaffleChain } from "@prisma/client";

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
