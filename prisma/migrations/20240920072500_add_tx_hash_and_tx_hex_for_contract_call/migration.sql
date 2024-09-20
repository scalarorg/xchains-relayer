/*
  Warnings:

  - Added the required column `txHash` to the `CallContract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `txHex` to the `CallContract` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CallContract" ADD COLUMN     "logIndex" INTEGER,
ADD COLUMN     "txHash" VARCHAR(255) NOT NULL,
ADD COLUMN     "txHex" BYTEA NOT NULL;
