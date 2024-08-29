import { PrismaClient } from '@prisma/client';
import {
  BtcEventTransaction,
  ContractCallSubmitted,
  ContractCallWithTokenSubmitted,
  EvmEvent,
  IBCEvent,
  Status,
} from '../types';
import {
  ContractCallWithTokenEventObject,
  ContractCallEventObject,
  ContractCallApprovedEventObject,
  ContractCallApprovedWithMintEventObject,
} from '../types/contracts/IAxelarGateway';
import { logger } from '../logger';
import { BigNumber, ethers } from 'ethers';

export class DatabaseClient {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  createCosmosContractCallEvent(event: IBCEvent<ContractCallSubmitted>) {
    console.log('Create Cosmos Contract Call Event with id: ', `${event.args.messageId}`);
  
    return this.prisma.relayData.create({
      data: {
        id: `${event.args.messageId}`,
        from: event.args.sourceChain.toLowerCase(),
        to: event.args.destinationChain.toLowerCase(),
        status: Status.PENDING,
        callContract: {
          create: {
            payload: event.args.payload.toLowerCase(),
            payloadHash: event.args.payloadHash.toLowerCase(),
            contractAddress: event.args.contractAddress.toLowerCase(),
            sourceAddress: event.args.sender.toLowerCase(),
          },
        },
      },
    });
  }

  createCosmosContractCallWithTokenEvent(event: IBCEvent<ContractCallWithTokenSubmitted>) {
    console.log(
      'Create Cosmos Contract Call With Token Event with id: ',
      `${event.args.messageId}`
    );

    return this.prisma.relayData.create({
      data: {
        id: `${event.args.messageId}`,
        from: event.args.sourceChain.toLowerCase(),
        to: event.args.destinationChain.toLowerCase(),
        status: Status.PENDING,
        callContractWithToken: {
          create: {
            payload: event.args.payload.toLowerCase(),
            payloadHash: event.args.payloadHash.toLowerCase(),
            contractAddress: event.args.contractAddress.toLowerCase(),
            sourceAddress: event.args.sender.toLowerCase(),
            amount: event.args.amount.toString(),
            symbol: event.args.symbol.toLowerCase(),
          },
        },
      },
    });
  }

  createEvmCallContractEvent(event: EvmEvent<ContractCallEventObject>) {
    console.log('Create EVM Call Contract Event with id: ', `${event.hash}-${event.logIndex}`);

    const id = `${event.hash}-${event.logIndex}`;
    return this.prisma.relayData.create({
      data: {
        id,
        from: event.sourceChain,
        to: event.destinationChain,
        callContract: {
          create: {
            blockNumber: event.blockNumber,
            payload: event.args.payload.toLowerCase(),
            payloadHash: event.args.payloadHash.toLowerCase(),
            contractAddress: event.args.destinationContractAddress.toLowerCase(),
            sourceAddress: event.args.sender.toLowerCase(),
          },
        },
      },
    });
  }

  createEvmCallContractWithTokenEvent(event: EvmEvent<ContractCallWithTokenEventObject>) {
    const id = `${event.hash}-${event.logIndex}`;

    console.log('Create EVM Call Contract With Token Event with id: ', id);
    return this.prisma.relayData.create({
      data: {
        id,
        from: event.sourceChain,
        to: event.destinationChain,
        callContractWithToken: {
          create: {
            blockNumber: event.blockNumber,
            payload: event.args.payload.toLowerCase(),
            payloadHash: event.args.payloadHash.toLowerCase(),
            contractAddress: event.args.destinationContractAddress.toLowerCase(),
            sourceAddress: event.args.sender.toLowerCase(),
            amount: event.args.amount.toString(),
            symbol: event.args.symbol.toLowerCase(),
          },
        },
      },
    });
  }

  createEvmContractCallApprovedEvent(event: EvmEvent<ContractCallApprovedEventObject>) {
    const id = `${event.hash}-${event.args.sourceEventIndex}-${event.logIndex}`;
    logger.debug(`[DatabaseClient] Create EvmContractCallApproved: "${event.hash}"`);
    this.prisma.callContractApproved.create({
      data: {
        id,
        sourceChain: event.sourceChain,
        destinationChain: event.destinationChain,
        txHash: event.hash,
        blockNumber: event.blockNumber,
        logIndex: event.logIndex,
        commandId: event.args.commandId,
        sourceAddress: event.args.sourceAddress,
        contractAddress: event.args.contractAddress,
        payloadHash: event.args.payloadHash,
        sourceTxHash: event.args.sourceTxHash,
        sourceEventIndex: Number(event.args.sourceEventIndex.toBigInt())
      },
    }).then((result) => logger.debug(`[DatabaseClient] Create DB result: "${JSON.stringify(result)}"`))
      .catch((error) => logger.error(`[DatabaseClient] Create DB with error: "${error}"`));
  }

  createEvmContractCallApprovedWithMintEvent(event: EvmEvent<ContractCallApprovedWithMintEventObject>) {
    const id = `${event.hash}-${event.logIndex}`;
    console.log('Create Evm Contract Call Approved With Mint Event with id: ', `${id}`);
  
    return this.prisma.callContractWithTokenApproved.create({
      data: {
        id,
        sourceChain: event.sourceChain,
        destinationChain: event.destinationChain,
        txHash: event.hash,
        blockNumber: event.blockNumber,
        logIndex: event.logIndex,
        commandId: event.args.commandId,
        sourceAddress: event.args.sourceAddress,
        contractAddress: event.args.contractAddress,
        payloadHash: event.args.payloadHash,
        sourceTxHash: event.args.sourceTxHash,
        sourceEventIndex: event.args.sourceEventIndex.toBigInt()
      },
    });
  }
  createBtcCallContractEvent(event: BtcEventTransaction) {
    const id = `${event.txHash}-${event.logIndex}`;
    console.log('Create BTC Call Contract Event with id: ', id);
    return this.prisma.relayData.create({
      data: {
        id,
        from: event.sourceChain,
        to: event.destinationChain,
        callContractWithToken: {
          create: {
            payload: event.payload.toLowerCase(),
            payloadHash: event.payloadHash.toLowerCase(),
            contractAddress: event.destinationContractAddress.toLowerCase(),
            sourceAddress: event.sender.toLowerCase(),
            amount: event.args.amount_minting,
            symbol: "",
          },
        },
      },
    });
  }
  //Todo: 20240829: Redesign function check operator ship for bitcoin
  async createOperatorEpoch(params: string) {
    const [newOperators, newWeights, newThreshold] = ethers.utils.defaultAbiCoder.decode(
      ['address[]', 'uint256[]', 'uint256'],
      params
    );
    console.log('newOperators', newOperators);
    console.log('newWeights', newWeights);
    console.log('newThreshold', newThreshold);
    const operatorsLength = newOperators.length;
    const weightsLength = newWeights.length;
    const threshold = BigNumber.from(newThreshold).toNumber();
    // Validate operators: must be sorted in ascending order and contain no duplicates
    if (operatorsLength === 0 || !this._isSortedAscAndContainsNoDuplicate(newOperators)) {
      throw new Error('InvalidOperators');
    }

    if (weightsLength !== operatorsLength) {
      throw new Error('InvalidWeights');
    }
    // Calculate the total weight
    const totalWeight: number = newWeights.reduce(
      (acc: BigNumber, weight: BigNumber) =>
        BigNumber.from(acc).toNumber() + BigNumber.from(weight).toNumber(),
      0
    );
    console.log('totalWeight', totalWeight);
    if (threshold === 0 || totalWeight < threshold) {
      throw new Error('InvalidThreshold');
    }

    const newOperatorsHash = ethers.utils.keccak256(params);
    if (
      await this.prisma.operatorship.findFirst({
        where: {
          hash: newOperatorsHash,
        },
      })
    ) {
      throw new Error('DuplicateOperators');
    }
    // Update the current hash
    return this.prisma.operatorship.create({
      data: {
        hash: newOperatorsHash,
      },
    });
  }
  _isSortedAscAndContainsNoDuplicate = (arr: string[]) => {
    const length = arr.length;

    for (let i = 1; i < length; ++i) {
      if (arr[i - 1].toLowerCase() >= arr[i].toLowerCase()) {
        return false;
      }
    }

    return true;
  };

  async findOperatorshipEpoch(hash: string) {
    const data = await this.prisma.operatorship.findFirst({
      where: {
        hash,
      },
      select: {
        id: true,
      },
    });
    return data ? data.id : 0;
  }
  async getCurrentEpoch() {
    const latestRecord = await this.prisma.operatorship.findFirst({
      orderBy: {
        id: 'desc', // Order by id in descending order to get the latest record
      },
      select: {
        id: true, // Only select the id field
      },
    });
    return latestRecord ? latestRecord.id : 0;
  }

  async updateCosmosToEvmEvent(
    event: IBCEvent<ContractCallSubmitted | ContractCallWithTokenSubmitted>,
    tx?: ethers.providers.TransactionReceipt
  ) {
    if (!tx) return;

    const record = await this.prisma.relayData.update({
      where: {
        id: event.args.messageId,
      },
      data: {
        executeHash: tx.transactionHash.toLowerCase(),
        status: Status.APPROVED,
      },
    });

    logger.info(`[handleCosmosToEvmEvent] DBUpdate: ${JSON.stringify(record)}`);
  }

  async findRelayDataById(
    id: string,
    options?: { callContract?: boolean; callContractWithToken?: boolean }
  ) {
    const callContract = options?.callContract || true;
    const callContractWithToken = options?.callContractWithToken || true;
    return this.prisma.relayData.findFirst({
      where: {
        id,
      },
      include: {
        callContract,
        callContractWithToken,
      },
    });
  }

  async findCosmosToEvmCallContractApproved(event: EvmEvent<ContractCallApprovedEventObject>) {
    const { contractAddress, sourceAddress, payloadHash } = event.args;

    const datas = await this.prisma.relayData.findMany({
      where: {
        OR: [
          {
            callContract: {
              payloadHash: payloadHash.toLowerCase(),
              sourceAddress: sourceAddress.toLowerCase(),
              contractAddress: contractAddress.toLowerCase(),
            },
            status: Status.PENDING,
          },
          {
            callContract: {
              payloadHash: payloadHash.toLowerCase(),
              sourceAddress: sourceAddress.toLowerCase(),
              contractAddress: contractAddress.toLowerCase(),
            },
            status: Status.APPROVED,
          },
        ],
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        callContract: {
          select: {
            payload: true,
          },
        },
        id: true,
      },
    });

    return datas.map((data) => ({
      id: data.id,
      payload: data.callContract?.payload,
    }));
  }

  async findCosmosToEvmCallContractWithTokenApproved(
    event: EvmEvent<ContractCallApprovedWithMintEventObject>
  ) {
    const { amount, contractAddress, sourceAddress, payloadHash } = event.args;

    const datas = await this.prisma.relayData.findMany({
      where: {
        OR: [
          {
            callContractWithToken: {
              payloadHash: payloadHash.toLowerCase(),
              sourceAddress: sourceAddress.toLowerCase(),
              contractAddress: contractAddress.toLowerCase(),
              amount: amount.toString(),
            },
            status: Status.PENDING,
          },
          {
            callContractWithToken: {
              payloadHash: payloadHash.toLowerCase(),
              sourceAddress: sourceAddress.toLowerCase(),
              contractAddress: contractAddress.toLowerCase(),
              amount: amount.toString(),
            },
            status: Status.APPROVED,
          },
        ],
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        callContractWithToken: {
          select: {
            payload: true,
          },
        },
        id: true,
      },
    });

    return datas.map((data) => ({
      id: data.id,
      payload: data.callContractWithToken?.payload,
    }));
  }

  async updateEventStatus(id: string, status: Status) {
    const executeDb = await this.prisma.relayData.update({
      where: {
        id,
      },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
    logger.info(`[DBUpdate] ${JSON.stringify(executeDb)}`);
  }

  async updateEventStatusWithPacketSequence(id: string, status: Status, sequence?: number) {
    const executeDb = await this.prisma.relayData.update({
      where: {
        id,
      },
      data: {
        status,
        packetSequence: sequence,
        updatedAt: new Date(),
      },
    });
    logger.info(`[DBUpdate] ${JSON.stringify(executeDb)}`);
  }

  async getBurningTx(payloadHash: string[]): Promise<string> {
    const burningTx = await this.prisma.callContract.findFirst({
      where: {
        payloadHash: {
          in: payloadHash,
        },
      },
    });
    return burningTx!.payload;
  }

  connect() {
    return this.prisma.$connect();
  }

  disconnect() {
    return this.prisma.$disconnect();
  }
}
