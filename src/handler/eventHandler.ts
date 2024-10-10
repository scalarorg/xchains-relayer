import { decodeGatewayExecuteData } from '../utils/evm';
import { AxelarClient, BtcClient, DatabaseClient, EvmClient } from '..';
import { logger } from '../logger';

import * as bitcoinjs from 'bitcoinjs-lib';

import {
  BtcTransactionReceipt,
  ContractCallSubmitted,
  ContractCallWithTokenSubmitted,
  EvmEvent,
  ExecuteRequest,
  IBCEvent,
  IBCPacketEvent,
  Status,
} from '../types';
import {
  ContractCallApprovedWithMintEventObject,
  ContractCallWithTokenEventObject,
  ContractCallApprovedEventObject,
  ContractCallEventObject,
} from '../types/contracts/IAxelarGateway';
import { handleCosmosToBTCApprovedEvent } from './eventBTCHandler';
import { getMempoolTx } from '../utils/btc-utils';

const getBatchCommandIdFromSignTx = (signTx: any) => {
  const rawLog = JSON.parse(signTx.rawLog || '{}');
  const events = rawLog[0].events;
  const signEvent = events.find((event: { type: string }) => event.type === 'sign');
  const batchedCommandId = signEvent.attributes.find(
    (attr: { key: string }) => attr.key === 'batchedCommandID'
  ).value;
  return batchedCommandId;
};

export async function handleEvmToCosmosConfirmEvent(
  vxClient: AxelarClient,
  executeParams: ExecuteRequest
) {
  const { id, payload } = executeParams;
  const [hash, logIndex] = id.split('-');

  logger.debug(
    `[handleEvmToCosmosConfirmEvent] Scalar: id: ${id}, hash: ${hash}, logIndex: ${logIndex}`
  );

  const routeMessageTx = await vxClient.routeMessageRequest(parseInt(logIndex), hash, payload);

  if (!routeMessageTx) {
    return {
      status: Status.FAILED,
    };
  }

  const isAlreadyExecuted = routeMessageTx.rawLog?.includes('already executed');

  if (isAlreadyExecuted) {
    logger.info(
      `[handleEvmToCosmosConfirmEvent] Already sent an executed tx for ${id}. Marked it as success.`
    );
    return {
      status: Status.SUCCESS,
    };
  } else {
    logger.info(`[handleEvmToCosmosConfirmEvent] Executed: ${routeMessageTx.transactionHash}`);
    const packetSequence = getPacketSequenceFromExecuteTx(routeMessageTx);
    return {
      status: Status.SUCCESS,
      packetSequence,
    };
  }
}

export async function handleEvmToCosmosEvent(
  vxClient: AxelarClient,
  event: EvmEvent<ContractCallWithTokenEventObject | ContractCallEventObject>
) {
  const confirmTx = await vxClient.confirmEvmTx(event.sourceChain, event.hash);
  if (confirmTx) {
    logger.info(`[handleEvmToCosmosEvent] Confirmed: ${confirmTx.transactionHash}`);
  }
}

export async function handleCosmosToEvmEvent<
  T extends ContractCallSubmitted | ContractCallWithTokenSubmitted
>(vxClient: AxelarClient, evmClients: EvmClient[], event: IBCEvent<T>) {
  // Find the evm client associated with event's destination chain
  const evmClient = evmClients.find(
    (client) => client.chainId.toLowerCase() === event.args.destinationChain.toLowerCase()
  );

  // If no evm client found, return
  if (!evmClient) return;

  logger.debug(`[handleCosmosToEvmEvent] Scalar Event: ${JSON.stringify(event)}`);

  const routeMessage = await vxClient.routeMessageRequest(
    -1,
    event.args.messageId,
    event.args.payload
  );

  if (routeMessage) {
    logger.info(`[handleCosmosToEvmEvent] RouteMessage: ${routeMessage.transactionHash}`);
  }

  const pendingCommands = await vxClient.getPendingCommands(event.args.destinationChain);

  logger.info(`[handleCosmosToEvmEvent] PendingCommands: ${JSON.stringify(pendingCommands)}`);
  if (pendingCommands.length === 0) return;

  const signCommand = await vxClient.signCommands(event.args.destinationChain);
  logger.debug(`[handleCosmosToEvmEvent] SignCommand: ${JSON.stringify(signCommand)}`);

  if (signCommand && signCommand.rawLog?.includes('failed')) {
    throw new Error(signCommand.rawLog);
  }
  if (!signCommand) {
    throw new Error('cannot sign command');
  }

  const batchedCommandId = getBatchCommandIdFromSignTx(signCommand);
  logger.info(`[handleCosmosToEvmEvent] BatchCommandId: ${batchedCommandId}`);

  const executeData = await vxClient.getExecuteDataFromBatchCommands(
    event.args.destinationChain,
    batchedCommandId
  );

  logger.info(`[handleCosmosToEvmEvent] BatchCommands: ${JSON.stringify(executeData)}`);

  const tx = await evmClient.gatewayExecute(executeData);
  if (!tx) return;
  logger.info(`[handleCosmosToEvmEvent] Execute: ${tx.transactionHash}`);
  logger.debug(`[handleCosmosToEvmEvent] Execute: ${JSON.stringify(tx)}`);
  return tx;
}
/*
 * ----- Gateway Contract Call -----
 * Prepare and call to the ScalarGateway for set some commands are approved
 * and ready to execute by call to the dApp's contract
 */
export async function handleCosmosApprovedEvent<
  T extends ContractCallSubmitted | ContractCallWithTokenSubmitted
>(
  event: IBCEvent<T>,
  vxClient: AxelarClient,
  db: DatabaseClient,
  evmClients: EvmClient[],
  btcClients: BtcClient[]
) {
  const id = event.args.destinationChain.toLowerCase();
  logger.debug(`[Scalar] Scalar Event: ${JSON.stringify(event)}`);
  // Find the evm client associated with event's destination chain
  const evmClient = evmClients.find((client) => client.chainId.toLowerCase() === id);
  if (evmClient) {
    const tx = await handleCosmosToEvmApprovedEvent(vxClient, evmClient, event);
    await db.updateCosmosToEvmEvent(event, tx);
    return;
  }

  const btcBroadcastClient = btcClients.find((btc) => btc.config.id === id && btc.isBroadcast());

  const btcSignerClient = btcClients.find((btc) => btc.config.id === id && btc.isSigner());

  if (btcBroadcastClient && btcSignerClient) {
    const result = await handleCosmosToBTCApprovedEvent(
      vxClient,
      btcBroadcastClient,
      btcSignerClient,
      db,
      event
    );

    const executedResult = await result?.executedResult;
    if (!executedResult) {
      logger.error(`[handleCosmosApprovedEvent] Failed to execute BTC Tx: ${executedResult}`);
      return;
    }

    console.log('[handleCosmosApprovedEvent] ExecutedResult: ', { executedResult });

    const batchedCommandId = result?.batchedCommandId;

    logger.info(`[BTC Tx Executed] BTC Tx: ${executedResult?.tx}`);

    const refPsbtBase64 = executedResult.psbtBase64;

    const psbtFromBase64 = bitcoinjs.Psbt.fromBase64(refPsbtBase64);
    const txInputHash = psbtFromBase64.txInputs[0].hash.reverse().toString('hex');
    // this line isn't necessary but it lets us know that the variable is a hash with 0x prefix
    const refTxHash = txInputHash.startsWith('0x') ? txInputHash : `0x${txInputHash}`;
    console.log('[handleCosmosApprovedEvent] RefTxHash: ', { refTxHash });

    // TODO:
    let receipt: Partial<BtcTransactionReceipt> | null | undefined;

    try {
      receipt = await btcBroadcastClient.getTransaction(executedResult?.tx);
    } catch (e) {
      console.error('Error when fetching btc tx from testnet node');

      receipt = await getMempoolTx(executedResult.tx, btcBroadcastClient.config.network as any);
      if (receipt === null) {
        console.error('Failed to retrieve mempool transaction data');
        // Handle failure case here
      } else {
        console.log('Mempool transaction:', receipt);
        // Process the result here
      }
    }

    if (!receipt) {
      throw Error('Not found btc receipt tx');
    }

    // CAUTION: Wrong flow, the problem is that the tx is broadcasted and update the status is success, the Right flow is Xchains-core need to approve then update status is approve then execute then update status is success
    await db.handleMultipleEvmToBtcEventsTx(
      event,
      receipt as BtcTransactionReceipt,
      refTxHash,
      batchedCommandId
    );

    logger.info(`[BTC Tx Executed] BTC Receipt: ${JSON.stringify(receipt)}`);
    return;
  }
  logger.error(`[handleCosmosApprovedEvent] No client found for chainId: ${id}`);
}
export async function handleCosmosToEvmApprovedEvent<
  T extends ContractCallSubmitted | ContractCallWithTokenSubmitted
>(vxClient: AxelarClient, evmClient: EvmClient, event: IBCEvent<T>) {
  // const confirmTx = await vxClient.callContract(event.args.sourceChain, event.args.contractAddress, event.args.payload);
  // if (confirmTx) {
  //   logger.info(`[handleCosmosToEvmApprovedEvent] Confirmed: ${confirmTx.transactionHash}`);
  // }

  // const routeMessage = await vxClient.routeMessageRequest(
  //   -1,
  //   event.args.messageId,
  //   event.args.payload
  // );

  // if (routeMessage) {
  //   logger.info(`[handleCosmosToEvmApprovedEvent] RouteMessage: ${routeMessage.transactionHash}`);
  // }

  const pendingCommands = await vxClient.getPendingCommands(event.args.destinationChain);

  logger.info(`[Scalar][CallEvm] PendingCommands: ${JSON.stringify(pendingCommands)}`);
  if (pendingCommands.length === 0) return;

  const signCommand = await vxClient.signCommands(event.args.destinationChain);
  logger.debug(`[Scalar][CallEvm] SignCommand: ${JSON.stringify(signCommand)}`);

  if (signCommand && signCommand.rawLog?.includes('failed')) {
    throw new Error(signCommand.rawLog);
  }
  if (!signCommand) {
    throw new Error('cannot sign command');
  }

  const batchedCommandId = getBatchCommandIdFromSignTx(signCommand);

  const executeData = await vxClient.getExecuteDataFromBatchCommands(
    event.args.destinationChain,
    batchedCommandId
  );
  const decodedExecuteData = decodeGatewayExecuteData(executeData);

  logger.info(`[Scalar][CallEvm] BatchCommandId: ${batchedCommandId}`);
  logger.info(`[Scalar][CallEvm] ExecuteData: ${JSON.stringify(executeData)}`);
  logger.info(`[Scalar][CallEvm] DecodedExecuteData: ${JSON.stringify(decodedExecuteData)}`);

  try {
    const tx = await evmClient.gatewayExecute(executeData);
    if (!tx) {
      logger.error(`[Scalar][CallEvm] Execute failed: ${JSON.stringify(tx)}`);
    }
    logger.debug(`[Scalar][CallEvm] Evm TxHash: ${JSON.stringify(tx)}`);
    return tx;
  } catch (e) {
    logger.error(`[Scalar][CallEvm] Execute failed: ${JSON.stringify(e)}`);
  }
}
/*
 * ----- dApp Contract Call -----
 * Prepare payload and call to the dApp contract
 * The payload must be match with the payloadHash, which is approved by the ScalarGateway
 */
export async function handleCosmosToEvmCallContractCompleteEvent(
  evmClient: EvmClient,
  event: EvmEvent<ContractCallApprovedEventObject>,
  relayDatas: { id: string; payload: string | undefined }[]
) {
  const { commandId, contractAddress, sourceAddress, sourceChain, payloadHash } = event.args;

  if (!relayDatas || relayDatas.length === 0) {
    logger.info(
      `[Scalar][Evm Execute]: Cannot find payload from given payloadHash: ${payloadHash}; commandId: ${commandId}`
    );
    return undefined;
  }

  const result = [];
  for (const data of relayDatas) {
    const { payload, id } = data;
    if (!payload) continue;

    // check if already executed
    const isExecuted = await evmClient.isCallContractExecuted(
      commandId,
      sourceChain,
      sourceAddress,
      contractAddress,
      payloadHash
    );
    if (isExecuted) {
      result.push({
        id,
        status: Status.SUCCESS,
      });
      logger.info(
        `[Scalar][Evm Execute]: Already executed txId ${data.id} with commandId ${commandId}. Will mark the status in the DB as Success.`
      );
      continue;
    }
    logger.debug(`[Scalar][Prepare to Execute]: Execute: 
      contractAddress: ${contractAddress}
      commandId: ${commandId}
      sourceChain: ${sourceChain}
      sourceAddress: ${sourceAddress}
      payload: ${payload}`);

    const tx = await evmClient.execute(
      contractAddress,
      commandId,
      sourceChain,
      sourceAddress,
      payload
    );

    if (!tx) {
      result.push({
        id,
        status: Status.FAILED,
      });
      logger.error(
        `[Scalar][Evm Execute]: Execute failed: ${id}. Will mark the status in the DB as Failed.`
      );
      continue;
    }

    logger.info(`[Scalar][Evm Execute]: Executed: ${JSON.stringify(tx)}`);

    result.push({
      id,
      status: Status.SUCCESS,
    });
  }

  return result;
}

export async function handleCosmosToEvmCallContractWithTokenCompleteEvent(
  evmClient: EvmClient,
  event: EvmEvent<ContractCallApprovedWithMintEventObject>,
  relayDatas: { id: string; payload: string | undefined }[]
) {
  const { amount, commandId, contractAddress, sourceAddress, sourceChain, symbol, payloadHash } =
    event.args;

  if (!relayDatas || relayDatas.length === 0) {
    logger.info(
      `[handleCosmosToEvmCallContractWithTokenCompleteEvent]: Cannot find payload from given payloadHash: ${payloadHash}`
    );
    return undefined;
  }

  const result = [];
  for (const relayData of relayDatas) {
    const { payload, id } = relayData;
    if (!payload) continue;

    const isExecuted = await evmClient.isCallContractWithTokenExecuted(
      commandId,
      sourceChain,
      sourceAddress,
      contractAddress,
      payloadHash,
      symbol,
      amount.toString()
    );

    if (isExecuted) {
      result.push({
        id,
        status: Status.SUCCESS,
      });
      logger.info(
        `[handleCosmosToEvmCallContractWithTokenCompleteEvent] Already executed: ${commandId}. Will mark the status in the DB as Success.`
      );
      continue;
    }

    const tx = await evmClient.executeWithToken(
      contractAddress,
      commandId,
      sourceChain,
      sourceAddress,
      payload,
      symbol,
      amount.toString()
    );

    if (!tx) {
      logger.info([
        '[handleCosmosToEvmCallContractWithTokenCompleteEvent] Execute failed: ${id}. Will mark the status in the DB as Failed.',
        id,
      ]);

      result.push({
        id,
        status: Status.FAILED,
      });

      continue;
    }

    logger.info(
      `[handleCosmosToEvmCallContractWithTokenCompleteEvent] executeWithToken: ${JSON.stringify(
        tx
      )}`
    );

    result.push({
      id,
      status: Status.SUCCESS,
    });
  }

  return result;
}

export async function handleEvmToCosmosCompleteEvent(client: AxelarClient, event: IBCPacketEvent) {
  logger.info(`[handleEvmToCosmosCompleteEvent] Memo: ${event.memo}`);
}

export async function prepareHandler(event: any, label = '') {
  logger.info(`[${label}] Event: ${JSON.stringify(event)}`);
  // reconnect prisma db
  // try {
  //   // await db.connect();
  //    // log event
  // } catch (e) {
  //   logger.error(`[${label}] Failed to connect to the database: ${e}`);
  // }
}

const getPacketSequenceFromExecuteTx = (executeTx: any) => {
  console.log(JSON.stringify(executeTx));
  const rawLog = JSON.parse(executeTx.rawLog || '{}');
  const events = rawLog[0].events;
  const sendPacketEvent = events.find((event: { type: string }) => event.type === 'send_packet');
  const seq = sendPacketEvent.attributes.find(
    (attr: { key: string }) => attr.key === 'packet_sequence'
  ).value;
  return parseInt(seq);
};
