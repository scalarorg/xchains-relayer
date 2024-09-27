/*
  Warnings:

  - A unique constraint covering the columns `[payloadHash,blockNumber]` on the table `CallContract` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CallContract_payloadHash_blockNumber_key" ON "CallContract"("payloadHash", "blockNumber");
