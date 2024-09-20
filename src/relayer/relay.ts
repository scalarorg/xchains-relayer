// import { Subject, mergeMap, of, throwError } from 'rxjs';
import { mergeMap, of, Subject, throwError } from 'rxjs';
import { AxelarClient, BtcClient, DatabaseClient, EvmClient } from '../clients';
import { axelarChain, btcChains, cosmosChains, env, evmChains, rabbitmqConfigs } from '../config';
import {
  handleAnyError,
  handleCosmosApprovedEvent,
  // handleEvmToCosmosEvent,
  handleCosmosToEvmCallContractCompleteEvent,
  handleEvmToCosmosConfirmEvent,
  prepareHandler,
} from '../handler';
import {
  AxelarCosmosContractCallApprovedEvent,
  AxelarEVMCompletedEvent,
  // AxelarCosmosContractCallEvent,
  // AxelarCosmosContractCallWithTokenEvent,
  // AxelarEVMCompletedEvent,
  // AxelarIBCCompleteEvent,
  AxelarListener,
  EvmContractCallApprovedEvent,
  EvmExecutedEvent,
  EvmListener,
} from '../listeners';
import { logger } from '../logger';
import { ContractCallSubmitted, ExecuteRequest } from '../types';
import {
  ContractCallApprovedEventObject,
  // ContractCallEventObject,
  ExecutedEventObject,
} from '../types/contracts/IAxelarGateway';
import { createCosmosEventSubject, createEvmEventSubject } from './subject';
// import { filterCosmosDestination, mapEventToEvmClient } from './rxOperators';
import { startRabbitMQRelayer } from './rabbitmq';
import { mapEventToEvmClient } from './rxOperators';

// import { transferOperatorship } from '../transferOperatorship';
// const sEvmCallContract = createEvmEventSubject<ContractCallEventObject>();
// const sEvmCallContractWithToken = createEvmEventSubject<ContractCallWithTokenEventObject>();
// const sEvmApproveContractCallWithToken =
//   createEvmEventSubject<ContractCallApprovedWithMintEventObject>();
const sEvmApproveContractCall = createEvmEventSubject<ContractCallApprovedEventObject>();
const sEvmExecuted = createEvmEventSubject<ExecutedEventObject>();
const sCosmosContractApprovedCall = createCosmosEventSubject<ContractCallSubmitted>();
// const sCosmosContractCall = createCosmosEventSubject<ContractCallSubmitted>();
// const sCosmosContractCallWithToken = createCosmosEventSubject<ContractCallWithTokenSubmitted>();

// Listening to the IBC packet event. This mean the any gmp flow (both contractCall and contractCallWithToken) from evm -> cosmos is completed.
const sEvmConfirmEvent = new Subject<ExecuteRequest>();
// const sCosmosApproveAny = new Subject<IBCPacketEvent>();

// Initialize DB client
const db = new DatabaseClient();

const connectDb = async () => {
  try {
    logger.info('Connecting to the database...');
    await db.connect();
  } catch (e) {
    logger.error('Failed to connect to the database:', e);
  }
};

const cosmosChainNames = cosmosChains.map((chain) => chain.chainId);

const setupEvmListeners = (axelarClient: AxelarClient, evmClients: EvmClient[]) => {
  /**
   *
   * @author: David
   * @description: Reason: The function is not used in this time.
   * @description: Date: 2024-09-19
   */
  /** DIRECTION: Evm -> Cosmos */
  // sEvmCallContractWithToken
  //   // Filter the event by the supported cosmos chains. This is to avoid conflict with existing relayers that relay to evm chains.
  //   .pipe(filterCosmosDestination(cosmosChains))
  //   .subscribe((event) => {
  //     const ev = event as EvmEvent<ContractCallWithTokenEventObject>;
  //     prepareHandler(ev, 'handleEvmToCosmosEvent')
  //       // Create the event in the database
  //       .then(() => db.createEvmCallContractWithTokenEvent(ev))
  //       // Wait for the event to be finalized
  //       .then(() => event.waitForFinality())
  //       //  Handle the event by sending the confirm tx to the axelar network
  //       .then(() => handleEvmToCosmosEvent(axelarClient, ev))
  //       // catch any error
  //       .catch((e) => handleAnyError(db, 'handleEvmToCosmosEvent', e));
  //   });

  sEvmConfirmEvent.subscribe((executeParams) => {
    prepareHandler(executeParams, 'handleEvmToCosmosConfirmEvent')
      // Send the execute tx to the axelar network
      .then(() => handleEvmToCosmosConfirmEvent(axelarClient, executeParams))
      // Update the event status in the database
      .then(({ status, packetSequence }) =>
        db.updateEventStatusWithPacketSequence(executeParams.id, status, packetSequence)
      )
      // catch any error
      .catch((e) => handleAnyError(db, 'handleEvmToCosmosConfirmEvent', e));
  });

  // sEvmCallContract
  //   // Filter the event by the supported cosmos chains. This is to avoid conflict with existing relayers that relay to evm chains.
  //   .pipe(filterCosmosDestination(cosmosChains))
  //   .subscribe((event) => {
  //     const ev = event as EvmEvent<ContractCallEventObject>;
  //     prepareHandler(event, 'handleEvmToCosmosEvent')
  //       // Create the event in the database
  //       .then(() => db.createEvmCallContractEvent(ev))
  //       // Wait for the event to be finalized
  //       .then(() => ev.waitForFinality())
  //       // Handle the event by sending the confirm tx to the axelar network
  //       .then(() => handleEvmToCosmosEvent(axelarClient, ev))
  //       // catch any error
  //       .catch((e) => handleAnyError(db, 'handleEvmToCosmosEvent', e));
  //   });

  /** DIRECTION: BTC -> Evm */

  // Subscribe to the ContractCallApprovedWithMint event at the gateway contract. (Cosmos -> EVM direction)
  // sEvmApproveContractCallWithToken
  //   // Select the evm client that matches the event's chain
  //   .pipe(mergeMap((event) => mapEventToEvmClient(event, evmClients)))
  //   .subscribe(({ evmClient, event }) => {
  //     const ev = event as EvmEvent<ContractCallApprovedWithMintEventObject>;
  //     prepareHandler(event, 'handleCosmosToEvmCallContractWithTokenCompleteEvent')
  //       // Find the array of relay data associated with the event from the database
  //       .then(() => db.findCosmosToEvmCallContractWithTokenApproved(ev))
  //       // Handle the event by calling executeWithToken function at the destination contract.
  //       .then((relayDatas) => {
  //         if (env.CHAIN_ENV === 'devnet' || env.CHAIN_ENV === 'testnet' || relayDatas?.length > 0) {
  //           // Create the event in the database for scanner
  //           db.createEvmContractCallApprovedWithMintEvent(ev);
  //         }
  //         return handleCosmosToEvmCallContractWithTokenCompleteEvent(evmClient, ev, relayDatas);
  //       })
  //       // Update the event status in the database
  //       .then((results) =>
  //         results?.forEach((result) => db.updateEventStatus(result.id, result.status))
  //       )
  //       // catch any error
  //       .catch((e) => handleAnyError(db, 'handleCosmosToEvmCallContractWithTokenCompleteEvent', e));
  //   });

  // Subscribe to the ContractCallApproved event at the gateway contract. (Cosmos -> EVM direction)
  sEvmApproveContractCall
    // Select the evm client that matches the event's chain
    .pipe(mergeMap((event) => mapEventToEvmClient(event, evmClients)))
    .subscribe(({ event, evmClient }) => {
      prepareHandler(event, '[Evm][ContractCallApproved]')
        // Find the array of relay data associated with the event from the database by payload hash
        .then(() => db.findCosmosToEvmCallContractApproved(event))
        // Handle the event by calling execute function at the destination contract.
        .then((relayDatas) => {
          if (env.CHAIN_ENV === 'devnet' || env.CHAIN_ENV === 'testnet' || relayDatas?.length > 0) {
            // Create the event in the database for scanner
            db.createEvmContractCallApprovedEvent(event);
          }
          return handleCosmosToEvmCallContractCompleteEvent(evmClient, event, relayDatas);
        })
        // Update the event status in the database
        .then((results) =>
          results?.forEach((result) => db.updateEventStatus(result.id, result.status))
        )
        .catch((e) => handleAnyError(db, 'handleCosmosToEvmCallContractCompleteEvent', e));
    });

  sEvmExecuted
    .pipe(
      mergeMap((event) => {
        // Find the evm client associated with event's destination chain
        const evmClient = evmClients.find(
          (client) => client.chainId.toLowerCase() === event.destinationChain.toLowerCase()
        );

        // If no evm client found, return
        if (!evmClient)
          return throwError(
            () => `No evm client found for event's destination chain ${event.destinationChain}`
          );

        return of({ event, evmClient });
      })
    )
    .subscribe(({ event }) => {
      prepareHandler(event, '[Evm][Executed]')
        // Find the array of relay data associated with the event from the database by payload hash
        .then(() => db.createEvmExecutedEvent(event))
        // Update the event status in the database
        .then((results) => logger.debug(`[Evm][Executed] Updated event status: ${results}`))
        .catch((e) => handleAnyError(db, 'handleEvmExecutedEvent', e));
    });
};

const runEvmListeners = (evmListeners: EvmListener[]) => {
  for (const evmListener of evmListeners) {
    try {
      /**
       *
       * @author: David
       * @description: Reason: The function is not used in this time.
       * @description: Date: 2024-09-19
       */
      // evmListener.listen(EvmContractCallWithTokenEvent, sEvmCallContractWithToken);
      // evmListener.listen(EvmContractCallWithTokenApprovedEvent, sEvmApproveContractCallWithToken);
      // evmListener.listen(EvmContractCallEvent, sEvmCallContract);
      evmListener.listen(EvmContractCallApprovedEvent, sEvmApproveContractCall);
      evmListener.listen(EvmExecutedEvent, sEvmExecuted);
    } catch (e) {
      logger.error(`Failed to listen to events for chain ${evmListener.chainId}: ${e}`);
    }
  }
};

const setupCosmosListeners = (
  axelarClient: AxelarClient,
  evmClients: EvmClient[],
  btcClients: BtcClient[]
) => {
  /**
   *
   * @author: David
   * @description: Reason: The function is not used in this time.
   * @description: Date: 2024-09-19
   */

  // Subscribe to the IBCComplete event at the axelar network. (EVM -> Cosmos direction)
  // sCosmosApproveAny.subscribe((event) => {
  //   prepareHandler(event, 'handleEvmToCosmosCompleteEvent')
  //     // Just logging the event for now
  //     .then(() => handleEvmToCosmosCompleteEvent(axelarClient, event))
  //     // catch any error
  //     .catch((e) => handleAnyError(db, 'handleEvmToCosmosCompleteEvent', e));
  // });

  // Subscribe to the ContractCall event at the axelar network. (Cosmos -> EVM direction)
  // sCosmosContractCall.subscribe((event) => {
  //   prepareHandler(event, 'handleContractCallFromCosmosToEvmEvent')
  //     // Create the event in the database
  //     .then(() => db.createCosmosContractCallEvent(event))
  //     // Handle the event by sending a bunch of txs to axelar network
  //     .then(() => handleCosmosToEvmEvent(axelarClient, evmClients, event))
  //     // Update the event status in the database
  //     .then((tx) => db.updateCosmosToEvmEvent(event, tx))
  //     // catch any error
  //     .catch((e) => handleAnyError(db, 'handleCosmosToEvmEvent', e));
  // });

  // Subscribe to the ContractCallWithToken event at the axelar network. (Cosmos -> EVM direction)
  // sCosmosContractCallWithToken.subscribe((event) => {
  //   prepareHandler(event, 'handleContractCallWithTokenFromCosmosToEvmEvent')
  //     // Create the event in the database
  //     // .then(() => db.createCosmosContractCallWithTokenEvent(event))
  //     // Handle the event by sending a bunch of txs to axelar network
  //     .then(() => handleCosmosToEvmEvent(axelarClient, evmClients, event))
  //     // Update the event status in the database
  //     .then((tx) => db.updateCosmosToEvmEvent(event, tx))
  //     // catch any error
  //     .catch((e) => handleAnyError(db, 'handleCosmosToEvmEvent', e));
  // });

  sCosmosContractApprovedCall.subscribe((event) => {
    prepareHandler(event, '[Scalar][ContractCallApproved]')
      // Create the event in the database
      // .then(() => db.createCosmosContractCallEvent(event))
      // Handle the event by sending a bunch of txs to axelar network
      .then(() => handleCosmosApprovedEvent(event, axelarClient, db, evmClients, btcClients))
      // catch any error
      .catch((e) => handleAnyError(db, 'handleCosmosToEvmApprovedEvent', e));
  });
};

const runCosmosListeners = (axelarListener: AxelarListener) => {
  try {
    axelarListener.listen(AxelarCosmosContractCallApprovedEvent, sCosmosContractApprovedCall);
    axelarListener.listen(AxelarEVMCompletedEvent, sEvmConfirmEvent);
    // axelarListener.listen(AxelarCosmosContractCallEvent, sCosmosContractCall);
    // axelarListener.listen(AxelarCosmosContractCallWithTokenEvent, sCosmosContractCallWithToken);
    // axelarListener.listen(AxelarIBCCompleteEvent, sCosmosApproveAny);
  } catch (e) {
    logger.error(`Failed to listen to events for Axelar network: ${e}`);
  }
};

export async function startRelayer() {
  logger.info('Starting transfer BTC operatorship...');

  // Connect to the database
  await connectDb();

  const axelarListener = new AxelarListener(axelarChain.ws);
  const evmListeners = evmChains.map((evm) => new EvmListener(evm, cosmosChainNames));
  const axelarClient = await AxelarClient.init(db, axelarChain);
  const evmClients = evmChains.map((evm) => new EvmClient(evm));
  const btcClients = btcChains.map((btc) => new BtcClient(btc));

  // for evm events
  setupEvmListeners(axelarClient, evmClients);

  // for cosmos events
  setupCosmosListeners(axelarClient, evmClients, btcClients);

  runEvmListeners(evmListeners);

  runCosmosListeners(axelarListener);

  // for btc events -> listen rabbitmq events
  for (const rabbitmq of rabbitmqConfigs) {
    try {
      logger.info('Starting rabbitmq relayer...');
      startRabbitMQRelayer(rabbitmq, db, axelarClient);
    } catch (e) {
      logger.error(`Failed to listen to events for rabbitmq: ${e}`);
    }
  }
}
