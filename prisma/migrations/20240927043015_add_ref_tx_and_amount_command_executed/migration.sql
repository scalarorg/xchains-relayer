/*
  Warnings:

  - The `payload` column on the `CallContract` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[payloadHash]` on the table `CallContract` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CallContract_payloadHash_blockNumber_key";

-- AlterTable
ALTER TABLE "CallContract" DROP COLUMN "payload",
ADD COLUMN     "payload" BYTEA;

-- AlterTable
ALTER TABLE "CommandExecuted" ADD COLUMN     "amount" VARCHAR(255),
ADD COLUMN     "referenceTxHash" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "CallContract_payloadHash_key" ON "CallContract"("payloadHash");
