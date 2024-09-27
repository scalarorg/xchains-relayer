/*
  Warnings:

  - Added the required column `senderAddress` to the `CallContract` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CallContract" ADD COLUMN     "senderAddress" VARCHAR(255) NOT NULL;
