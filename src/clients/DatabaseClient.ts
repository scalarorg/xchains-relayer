import { PrismaClient } from '@prisma/client';
import { BigNumber, ethers } from 'ethers';
import { logger } from '../logger';
import {
  BtcEventTransaction,
  BtcTransactionReceipt,
  ContractCallSubmitted,
  ContractCallWithTokenSubmitted,
  EvmEvent,
  IBCEvent,
  Status,
} from '../types';
import {
  ContractCallApprovedEventObject,
  ContractCallApprovedWithMintEventObject,
  // ContractCallWithTokenEventObject,
  ContractCallEventObject,
  ExecutedEventObject,
} from '../types/contracts/IAxelarGateway';

export class DatabaseClient {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   *
   * @author: David
   * @description: Reason: The function is not used in this time.
   * @description: Date: 2024-09-19
   */
  // createCosmosContractCallEvent(event: IBCEvent<ContractCallSubmitted>) {
  //   console.log('Create Cosmos Contract Call Event with id: ', `${event.args.messageId}`);

  //   return this.prisma.relayData.create({
  //     data: {
  //       id: `${event.args.messageId}`,
  //       from: event.args.sourceChain.toLowerCase(),
  //       to: event.args.destinationChain.toLowerCase(),
  //       status: Status.PENDING,
  //       callContract: {
  //         create: {
  //           payload: event.args.payload.toLowerCase(),
  //           payloadHash: event.args.payloadHash.toLowerCase(),
  //           contractAddress: event.args.contractAddress.toLowerCase(),
  //           sourceAddress: event.args.sender.toLowerCase(),
  //           stakerPublicKey: '', //TODO: Add stakerPublicKey
  //           logIndex: event.logIndex,
  //         },
  //       },
  //     },
  //   });
  // }

  /**
   *
   * @author: David
   * @description: Reason: The function is not used in this time.
   * @description: Date: 2024-09-19
   */
  // createCosmosContractCallWithTokenEvent(event: IBCEvent<ContractCallWithTokenSubmitted>) {
  //   console.log(
  //     'Create Cosmos Contract Call With Token Event with id: ',
  //     `${event.args.messageId}`
  //   );

  //   return this.prisma.relayData.create({
  //     data: {
  //       id: `${event.args.messageId}`,
  //       from: event.args.sourceChain.toLowerCase(),
  //       to: event.args.destinationChain.toLowerCase(),
  //       status: Status.PENDING,
  //       callContractWithToken: {
  //         create: {
  //           payload: event.args.payload.toLowerCase(),
  //           payloadHash: event.args.payloadHash.toLowerCase(),
  //           contractAddress: event.args.contractAddress.toLowerCase(),
  //           sourceAddress: event.args.sender.toLowerCase(),
  //           amount: event.args.amount.toString(),
  //           symbol: event.args.symbol.toLowerCase(),
  //         },
  //       },
  //     },
  //   });
  // }

  /**
   *
   * @author: David
   * @description: Reason: The function is not used in this time.
   * @description: Date: 2024-09-19
   */
  // createEvmCallContractWithTokenEvent(event: EvmEvent<ContractCallWithTokenEventObject>) {
  //   const id = `${event.hash}-${event.logIndex}`;
  //   return this.prisma.relayData.create({
  //     data: {
  //       id,
  //       from: event.sourceChain,
  //       to: event.destinationChain,
  //       callContractWithToken: {
  //         create: {
  //           blockNumber: event.blockNumber,
  //           payload: event.args.payload.toLowerCase(),
  //           payloadHash: event.args.payloadHash.toLowerCase(),
  //           contractAddress: event.args.destinationContractAddress.toLowerCase(),
  //           sourceAddress: event.args.sender.toLowerCase(),
  //           amount: event.args.amount.toString(),
  //           symbol: event.args.symbol.toLowerCase(),
  //         },
  //       },
  //     },
  //   });
  // }

  /**
   *
   * @author: David
   * @description: Reason: The function is not used in this time.
   * @description: Date: 2024-09-19
   */
  // createEvmContractCallApprovedWithMintEvent(
  //   event: EvmEvent<ContractCallApprovedWithMintEventObject>
  // ) {
  //   const id = `${event.hash}-${event.logIndex}`;
  //   console.log('Create Evm Contract Call Approved With Mint Event with id: ', `${id}`);

  //   return this.prisma.callContractWithTokenApproved.create({
  //     data: {
  //       id,
  //       sourceChain: event.sourceChain,
  //       destinationChain: event.destinationChain,
  //       txHash: event.hash,
  //       blockNumber: event.blockNumber,
  //       logIndex: event.logIndex,
  //       commandId: event.args.commandId,
  //       sourceAddress: event.args.sourceAddress,
  //       contractAddress: event.args.contractAddress,
  //       payloadHash: event.args.payloadHash,
  //       symbol: event.args.symbol,
  //       amount: event.args.amount.toBigInt(),
  //       sourceTxHash: event.args.sourceTxHash,
  //       sourceEventIndex: event.args.sourceEventIndex.toBigInt(),
  //     },
  //   });
  // }

  createEvmCallContractEvent(event: EvmEvent<ContractCallEventObject>) {
    const id = `${event.hash.toLowerCase()}-${event.logIndex}`;
    const data = {
      id,
      from: event.sourceChain,
      to: event.destinationChain,
      callContract: {
        create: {
          txHash: event.hash.toLowerCase(),
          blockNumber: event.blockNumber,
          payload: Buffer.from(event.args.payload.replace('0x', ''), 'hex'),
          payloadHash: event.args.payloadHash.toLowerCase(),
          contractAddress: event.args.destinationContractAddress.toLowerCase(),
          sourceAddress: event.args.sender.toLowerCase(),
          senderAddress: event.args.sender,
          logIndex: event.logIndex,
        },
      },
    };

    logger.debug('[DatabaseClient] Create Evm Call Contract Event: ', data);

    return this.prisma.relayData.create({
      data,
    });
  }

  async createEvmContractCallApprovedEvent(event: EvmEvent<ContractCallApprovedEventObject>) {
    const id = `${event.hash}-${event.args.sourceEventIndex}-${event.logIndex}`;
    const data = {
      id,
      sourceChain: event.sourceChain,
      destinationChain: event.destinationChain,
      txHash: event.hash.toLowerCase(),
      blockNumber: event.blockNumber,
      logIndex: event.logIndex,
      commandId: event.args.commandId,
      sourceAddress: event.args.sourceAddress.toLowerCase(),
      contractAddress: event.args.contractAddress.toLowerCase(),
      payloadHash: event.args.payloadHash.toLowerCase(),
      sourceTxHash: event.args.sourceTxHash.toLowerCase(),
      sourceEventIndex: Number(event.args.sourceEventIndex.toBigInt()),
    };

    logger.debug('[DatabaseClient] Create EvmContractCallApproved: ', data);

    return this.prisma.callContractApproved
      .create({
        data,
      })
      .then((result: any) =>
        logger.debug(`[DatabaseClient] Create DB result: "${JSON.stringify(result)}"`)
      )
      .catch((error: any) => logger.error(`[DatabaseClient] Create DB with error: "${error}"`));
  }

  async createEvmExecutedEvent(event: EvmEvent<ExecutedEventObject>) {
    const id = `${event.hash}-${event.logIndex}`;
    logger.debug(`[DatabaseClient] Create EvmExecuted: "${id}"`);
    return this.prisma.commandExecuted
      .create({
        data: {
          id,
          sourceChain: event.sourceChain,
          destinationChain: event.destinationChain,
          txHash: event.hash,
          blockNumber: event.blockNumber,
          logIndex: event.logIndex,
          commandId: event.args.commandId,
          status: Status.SUCCESS,
          // amount: '',
          // referenceTxHash: '',
        },
      })
      .then((result: any) =>
        logger.debug(`[DatabaseClient] Create DB result: "${JSON.stringify(result)}"`)
      )
      .catch((error: any) => logger.error(`[DatabaseClient] Create DB with error: "${error}"`));
  }

  createBtcCallContractEvent(event: BtcEventTransaction) {
    const id = `${event.txHash.toLowerCase()}-${event.logIndex}`;
    // logger.debug(`[DatabaseClient] Create BtcCallContract - event: `, event);
    const payloadBytes = Buffer.from(event.payload.replace('0x', ''), 'hex');

    const relayData = {
      id,
      from: event.sourceChain,
      to: event.destinationChain,
      callContract: {
        create: {
          txHash: event.txHash.toLowerCase(),
          txHex: Buffer.from(event.vaultTxHex, 'hex'),
          blockNumber: event.blockNumber,
          payload: payloadBytes,
          payloadHash: event.payloadHash.toLowerCase(),
          contractAddress: event.destinationContractAddress.toLowerCase(),
          sourceAddress: event.sender.toLowerCase(),
          amount: event.mintingAmount,
          symbol: '',
          stakerPublicKey: event.stakerPublicKey.toLowerCase(),
          logIndex: event.logIndex,
        },
      },
    };

    logger.debug(`[DatabaseClient] Create BtcCallContract: ${JSON.stringify(relayData)}`);

    return this.prisma.relayData.create({
      data: relayData,
    });
  }

  // async createBtcContractCallApprovedEvent(
  //   event: IBCEvent<ContractCallSubmitted | ContractCallWithTokenSubmitted>,
  //   tx: BtcTransactionReceipt,
  //   batchedCommandId: any
  // ) {
  //   const data = {
  //     id: event.args.messageId,
  //     sourceChain: event.args.sourceChain,
  //     destinationChain: event.args.destinationChain,
  //     txHash: event.hash.toLowerCase(),
  //     blockNumber: tx?.blockheight || 0,
  //     logIndex: tx?.blockindex || 0,
  //     commandId: batchedCommandId,
  //     sourceAddress: event.args.sender, //smart contract address
  //     contractAddress: event.args.contractAddress.toLowerCase(), // btc contract address, default is 0x000000...
  //     payloadHash: event.args.payloadHash.toLowerCase(),
  //     sourceTxHash: event.hash.toLowerCase(),
  //     sourceEventIndex: Number(event.args.messageId.split('-')[1]),
  //   };

  //   logger.debug('[DatabaseClient] Create EvmContractCallApproved: ', data);

  //   return this.prisma.callContractApproved
  //     .create({
  //       data,
  //     })
  //     .then((result: any) =>
  //       logger.debug(`[DatabaseClient] Create DB result: "${JSON.stringify(result)}"`)
  //     )
  //     .catch((error: any) => logger.error(`[DatabaseClient] Create DB with error: "${error}"`));
  // }

  // async createBtcExecutedEvent(
  //   event: IBCEvent<ContractCallSubmitted | ContractCallWithTokenSubmitted>,
  //   tx: BtcTransactionReceipt,
  //   batchedCommandId: string
  // ) {
  //   return (
  //     this.prisma.commandExecuted
  //       //TODO: 20240925: Redesign function create btc executed event
  //       .create({
  //         data: {
  //           id: event.args.messageId,
  //           sourceChain: event.args.sourceChain,
  //           destinationChain: event.args.destinationChain,
  //           txHash: tx?.txid.toLowerCase() || '',
  //           blockNumber: tx?.blockheight || 0,
  //           logIndex: tx?.blockindex || 0,
  //           commandId: batchedCommandId,
  //           status: Status.SUCCESS,
  //         },
  //       })
  //       .then((result: any) =>
  //         logger.debug(`[DatabaseClient] Create DB result: "${JSON.stringify(result)}"`)
  //       )
  //       .catch((error: any) => logger.error(`[DatabaseClient] Create DB with error: "${error}"`))
  //   );
  // }

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

    logger.info(`[DatabaseClient] [Evm ContractCallApproved]: ${JSON.stringify(record)}`);
  }

  async handleMultipleEvmToBtcEventsTx(
    event: IBCEvent<ContractCallSubmitted | ContractCallWithTokenSubmitted>,
    tx: BtcTransactionReceipt,
    refTxHash: string,
    batchedCommandId: string
  ) {
    if (!tx) return;

    // handle BTC ContractCallApproved in the Tx

    const contractCallData = {
      executeHash: tx.txid.toLowerCase(),
      status: Status.SUCCESS,
    };

    const contractCallApprovedData = {
      id: event.args.messageId,
      sourceChain: event.args.sourceChain,
      destinationChain: event.args.destinationChain,
      txHash: event.hash.toLowerCase(),
      blockNumber: tx?.blockheight || 0,
      logIndex: tx?.blockindex || 0,
      commandId: batchedCommandId,
      sourceAddress: event.args.sender, //smart contract address
      contractAddress: event.args.contractAddress.toLowerCase(), // btc contract address, default is 0x000000...
      payloadHash: event.args.payloadHash.toLowerCase(),
      sourceTxHash: event.hash.toLowerCase(),
      sourceEventIndex: Number(event.args.messageId.split('-')[1]),
    };

    const executedData = {
      id: event.args.messageId,
      sourceChain: event.args.sourceChain,
      destinationChain: event.args.destinationChain,
      txHash: tx?.txid.toLowerCase() || '',
      blockNumber: tx?.blockheight || 0,
      logIndex: tx?.blockindex || 0,
      commandId: batchedCommandId,
      status: Status.SUCCESS,
      referenceTxHash: refTxHash,
      amount: tx.amount.toString(),
    };

    try {
      const transaction = await this.prisma.$transaction([
        this.prisma.relayData.update({
          where: {
            id: event.args.messageId,
          },
          data: contractCallData,
        }),
        this.prisma.callContractApproved.create({
          data: contractCallApprovedData,
        }),
        this.prisma.commandExecuted.create({
          data: executedData,
        }),
      ]);

      logger.info(
        `[DatabaseClient] [handleMultipleEvmToBtcEventsTx]: ${JSON.stringify(transaction)}`
      );
    } catch (error) {
      logger.error(`[DatabaseClient] [handleMultipleEvmToBtcEventsTx]: ${error}`);
    }
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

    return datas.map((data: any) => ({
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

    return datas.map((data: any) => ({
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

  async getBurningTx(payloadHash: string): Promise<string> {
    logger.debug(`[DatabaseClient] Get Burning Tx with payloadHash: ${payloadHash}`);
    const burningTx = await this.prisma.callContract.findUnique({
      where: {
        payloadHash: payloadHash.toLowerCase(),
      },
    });

    const payloadHexString = burningTx?.payload?.toString('hex');
    if (!payloadHexString) {
      throw new Error('PayloadNotFound');
    }

    return payloadHexString;
  }

  connect() {
    return this.prisma.$connect();
  }

  disconnect() {
    return this.prisma.$disconnect();
  }
}
