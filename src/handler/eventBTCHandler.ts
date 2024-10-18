import { BigNumber, ethers } from 'ethers';
import { AxelarClient, DatabaseClient } from '..';
import { logger } from '../logger';
import { processBurningTxs } from '../services/dApp';
import { ContractCallSubmitted, ContractCallWithTokenSubmitted, IBCEvent } from '../types';

const getBatchCommandIdFromSignTx = (signTx: any) => {
  const rawLog = JSON.parse(signTx.rawLog || '{}');
  const events = rawLog[0].events;
  const signEvent = events.find((event: { type: string }) => event.type === 'sign');
  const batchedCommandId = signEvent.attributes.find(
    (attr: { key: string }) => attr.key === 'batchedCommandID'
  ).value;
  return batchedCommandId;
};

export async function handleCosmosToBTCApprovedEvent<
  T extends ContractCallSubmitted | ContractCallWithTokenSubmitted
>(vxClient: AxelarClient, db: DatabaseClient, event: IBCEvent<T>) {
  console.log(`[handleCosmosToBTCApprovedEvent] Event: ${JSON.stringify(event)}`);
  const pendingCommands = await vxClient.getPendingCommands(event.args.destinationChain);
  logger.info(
    `[handleCosmosToBTCApprovedEvent] PendingCommands: ${JSON.stringify(pendingCommands)}`
  );
  if (pendingCommands.length === 0) return;

  const signCommand = await vxClient.signCommands(event.args.destinationChain);
  logger.debug(`[handleCosmosToBTCApprovedEvent] SignCommand: ${JSON.stringify(signCommand)}`);

  if (signCommand && signCommand.rawLog?.includes('failed')) {
    throw new Error(signCommand.rawLog);
  }
  if (!signCommand) {
    throw new Error('cannot sign command');
  }

  const batchedCommandId = getBatchCommandIdFromSignTx(signCommand);
  logger.info(`[handleCosmosToBTCApprovedEvent] BatchCommandId: ${batchedCommandId}`);

  const executeData = await vxClient.getExecuteDataFromBatchCommands(
    event.args.destinationChain,
    batchedCommandId
  );

  logger.info(`[handleCosmosToBTCApprovedEvent] BatchCommands: ${JSON.stringify(executeData)}`);
  return {
    executedResult: handleBTCExecute(db, executeData),
    batchedCommandId,
  };
}

const handleBTCExecute = async (db: DatabaseClient, executeData: string) => {
  const executeABI = ['function execute(bytes calldata input) external'];
  const executeInterface = new ethers.utils.Interface(executeABI);
  console.log('Before: ', executeData);

  const executeDataDecoded = executeInterface.decodeFunctionData('execute', executeData);

  console.log('[execute] ExecuteDataDecoded', executeDataDecoded);

  const input = executeDataDecoded.input;

  return execute(db, input);
};

const execute = async (db: DatabaseClient, input: string) => {
  console.log('[execute] Input', input);

  // Decode the input
  const [data, proof] = ethers.utils.defaultAbiCoder.decode(['bytes', 'bytes'], input);

  console.log('[execute] proof', proof);

  // Hash the data and sign the message
  const dataHash = ethers.utils.keccak256(data);
  const messageHash = ethers.utils.hashMessage(ethers.utils.arrayify(dataHash));

  console.log('[execute] MessageHash', messageHash);

  // Validate proof with BTC auth module
  //FIXME: need to validate bitcoin on-chain
  // const allowOperatorshipTransfer = await validateProof(messageHash, proof);
  // logger.info('[execute] ProofValidated', allowOperatorshipTransfer);
  // Decode data
  const [chainId, commandIds, commands, params] = ethers.utils.defaultAbiCoder.decode(
    ['uint256', 'bytes32[]', 'string[]', 'bytes[]'],
    data
  );
  logger.info('[execute] DecodedData', chainId, commandIds, commands, params);

  if (BigNumber.from(chainId).toNumber() !== 2) {
    throw new Error('InvalidChainId');
  }

  const commandsLength = commandIds.length;

  if (commandsLength !== commands.length || commandsLength !== params.length) {
    throw new Error('InvalidCommands');
  }

  for (let i = 0; i < commandsLength; ++i) {
    // TODO: Ignore if duplicate commandId received
    // const commandId = commandIds[i];
    // if (isCommandExecuted(commandId)) continue;
    const commandHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(commands[i]));
    if (commandHash !== ethers.utils.id('approveContractCall')) continue;
    // decode params
    const paramsDecoded = ethers.utils.defaultAbiCoder.decode(
      ['string', 'string', 'address', 'bytes32', 'bytes32', 'uint256'],
      params[i]
    );
    const [
      sourceChain,
      sourceAddress,
      contractAddress,
      payloadHash,
      sourceTxHash,
      sourceEventIndex,
    ] = paramsDecoded;

    console.log('[execute btc tx] Params Decoded: ', {
      sourceChain,
      sourceAddress,
      contractAddress,
      payloadHash,
      sourceTxHash,
      sourceEventIndex,
    });
    console.log('[execute btc tx] Payload Hash: ', payloadHash);

    //TODO: need to join the CommandExecuted Table to check if the command is already executed or not
    const burningPsbtEncode = await db.getBurningTx(payloadHash);
    if (!burningPsbtEncode) {
      throw new Error('BurningPsbtNotFound');
    }
    console.log('[execute btc tx] Burning Psbt Encoded: ', burningPsbtEncode);
    // decode from ETH to BTC
    const burningPsbtDecode = ethers.utils.defaultAbiCoder.decode(
      ['string'],
      // this line isn't necessary but it's a good practice to ensure the string is prefixed with '0x'
      burningPsbtEncode.startsWith('0x') ? burningPsbtEncode : '0x' + burningPsbtEncode
    );
    console.log('[execute btc tx] Burning Psbt Decoded: ', burningPsbtDecode);

    // TODO: remove btcSignerClient and btcBroadcastClient

    const data = await processBurningTxs(burningPsbtDecode[0], sourceChain, sourceTxHash);

    console.log({ psbt: burningPsbtDecode[0] as string });
    logger.info('[execute] Successfully process burning psbt: ', burningPsbtDecode[0]);
    //     // Mark the command as executed

    // TODO: Implement mark command as executed
    //     await _setCommandExecuted(contract, commandId, true);
    //     console.log('SetCommandSelectorSuccess');

    //     try {
    //       // Execute the command
    //       const tx = await contract[commandSelector](...params[i], commandId);
    //       await tx.wait();
    //       console.log('Executed', commandId);
    //     } catch (error) {
    //       // Revert the execution mark if failed
    //       await _setCommandExecuted(contract, commandId, false);
    //       console.error('Command execution failed', commandId, error);
    //     }
    //   }
    //  logger.info('[execute] mark command as executed');

    return {
      tx: data,
      psbtBase64: burningPsbtDecode[0] as string,
    };
  }
};

// const isCommandExecuted = async (commandId: string) => {
//   return getBool(_getIsCommandExecutedKey(commandId));
// };

// // function _getIsCommandExecutedKey(bytes32 commandId) internal pure returns (bytes32) {
// //         return keccak256(abi.encodePacked(PREFIX_COMMAND_EXECUTED, commandId));
// //     }
// const _getIsCommandExecutedKey = (commandId: string) => {
//   return ethers.utils.keccak256(
//     ethers.utils.defaultAbiCoder.encode(
//       ['bytes32', 'bytes32'],
//       [PREFIX_COMMAND_EXECUTED, commandId]
//     )
//   );
// };
