-- Drop dictionary pool; raffle passwords are admin-defined only
ALTER TABLE "Raffle" DROP CONSTRAINT IF EXISTS "Raffle_passwordWordId_fkey";
ALTER TABLE "Raffle" DROP COLUMN IF EXISTS "passwordWordId";
DROP TABLE IF EXISTS "RafflePasswordWord";
