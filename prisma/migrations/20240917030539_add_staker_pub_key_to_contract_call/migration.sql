-- CreateTable
CREATE TABLE "RelayData" (
    "id" VARCHAR(255) NOT NULL,
    "packetSequence" INTEGER,
    "executeHash" VARCHAR(255),
    "status" INTEGER NOT NULL DEFAULT 0,
    "from" VARCHAR(255) NOT NULL,
    "to" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelayData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallContractWithToken" (
    "id" VARCHAR(255) NOT NULL,
    "blockNumber" INTEGER DEFAULT 0,
    "contractAddress" VARCHAR(255) NOT NULL,
    "amount" VARCHAR(255) NOT NULL,
    "symbol" VARCHAR(255) NOT NULL,
    "payload" TEXT NOT NULL,
    "payloadHash" VARCHAR(255) NOT NULL,
    "sourceAddress" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallContractWithToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallContract" (
    "id" VARCHAR(255) NOT NULL,
    "blockNumber" INTEGER DEFAULT 0,
    "contractAddress" VARCHAR(255) NOT NULL,
    "amount" VARCHAR(255),
    "symbol" VARCHAR(255),
    "payload" TEXT NOT NULL,
    "payloadHash" VARCHAR(255) NOT NULL,
    "sourceAddress" VARCHAR(255) NOT NULL,
    "stakerPublicKey" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallContractApproved" (
    "id" VARCHAR(255) NOT NULL,
    "sourceChain" VARCHAR(255) NOT NULL,
    "destinationChain" VARCHAR(255) NOT NULL,
    "txHash" VARCHAR(255) NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "sourceAddress" VARCHAR(255) NOT NULL,
    "contractAddress" VARCHAR(255) NOT NULL,
    "sourceTxHash" VARCHAR(255) NOT NULL,
    "sourceEventIndex" INTEGER NOT NULL,
    "payloadHash" VARCHAR(255) NOT NULL,
    "commandId" TEXT NOT NULL,
    "callContractId" VARCHAR(255),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallContractApproved_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallContractWithTokenApproved" (
    "id" VARCHAR(255) NOT NULL,
    "sourceChain" VARCHAR(255) NOT NULL,
    "destinationChain" VARCHAR(255) NOT NULL,
    "txHash" VARCHAR(255) NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "sourceAddress" VARCHAR(255) NOT NULL,
    "contractAddress" VARCHAR(255) NOT NULL,
    "sourceTxHash" VARCHAR(255) NOT NULL,
    "sourceEventIndex" BIGINT NOT NULL,
    "payloadHash" VARCHAR(255) NOT NULL,
    "symbol" VARCHAR(255) NOT NULL,
    "amount" BIGINT NOT NULL,
    "commandId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallContractWithTokenApproved_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandExecuted" (
    "id" VARCHAR(255) NOT NULL,
    "sourceChain" VARCHAR(255) NOT NULL,
    "destinationChain" VARCHAR(255) NOT NULL,
    "txHash" VARCHAR(255) NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "commandId" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CommandExecuted_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operatorship" (
    "id" SERIAL NOT NULL,
    "hash" TEXT NOT NULL,

    CONSTRAINT "Operatorship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RelayData_packetSequence_key" ON "RelayData"("packetSequence");

-- CreateIndex
CREATE UNIQUE INDEX "CallContractApproved_callContractId_key" ON "CallContractApproved"("callContractId");

-- AddForeignKey
ALTER TABLE "CallContractWithToken" ADD CONSTRAINT "CallContractWithToken_id_fkey" FOREIGN KEY ("id") REFERENCES "RelayData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallContract" ADD CONSTRAINT "CallContract_id_fkey" FOREIGN KEY ("id") REFERENCES "RelayData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallContractApproved" ADD CONSTRAINT "CallContractApproved_callContractId_fkey" FOREIGN KEY ("callContractId") REFERENCES "CallContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
