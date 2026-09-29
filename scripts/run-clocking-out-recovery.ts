import { recoverClockingOutGiveaway } from "../src/lib/raffles/clocking-out-recovery";

async function main() {
  const result = await recoverClockingOutGiveaway();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
