import { AxelarClient, DatabaseClient } from '../clients';
import { evmChains, RabbitMQConfig } from '../config';
import { logger } from '../logger';
import amqp, { Connection, Channel } from 'amqplib/callback_api';
import { BtcEventTransaction, BtcTransaction } from '../types';
import { ethers } from 'ethers';

function base64ToHex(base64Value: string): string {
  return `0x${Buffer.from(base64Value, 'base64').toString('hex')}`;
}
function base64ToDecimal(base64Value: string): string {
  const hex = base64ToHex(base64Value);
  return String(Number(hex));
}
/*
 * Get the chain name by chain id
 * @param chainId: string ex. 11155111
 * @returns string | undefined
 */
export function getChainNameById(chainId: string): string | undefined {
  for (const chain of evmChains) {
    if (chain.chainId === chainId) {
      return chain.name;
    }
  }
}
/*
 * Create a BtcEventTransaction object from a BtcTransaction object
 * @param btcTransaction: BtcTransaction
 * @returns BtcEventTransaction
 */
export function createBtcEventTransaction(
  sourceChain: string,
  btcTransaction: BtcTransaction
): BtcEventTransaction {
  const toAddress = base64ToHex(btcTransaction.chain_id_user_address);
  const amount_decode = base64ToDecimal(btcTransaction.amount_minting);
  const chainId = base64ToDecimal(btcTransaction.chain_id);
  const amount = ethers.utils.parseUnits(amount_decode, 0);

  const payload = ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [toAddress, amount]);
  const payloadHash = ethers.utils.keccak256(payload);
  const destinationChain = getChainNameById(chainId);
  if (destinationChain === undefined) {
    throw new Error(`[RabbitMQ][BTC Event Parser]: destination chain not found: ${chainId}`);
  }

  const btcEvent: BtcEventTransaction = {
    txHash: `0x${btcTransaction.vault_tx_hash_hex.toLowerCase()}`,
    logIndex: 0,
    blockNumber: 0,
    mintingAmount: Number(amount).toString(),
    sender: base64ToHex(btcTransaction.chain_id_user_address),
    sourceChain,
    destinationChain,
    destinationContractAddress: base64ToHex(btcTransaction.chain_id_smart_contract_address),
    payload,
    payloadHash,
    args: btcTransaction,
    stakerPublicKey: btcTransaction.staker_pk_hex,
    vaultTxHex: btcTransaction.vault_tx_hex,
  };
  return btcEvent;
}

/*
 * Handle a message from the RabbitMQ queue
 * @param db: DatabaseClient
 * @param axelarClient: AxelarClient
 * @param channel: amqp.Channel
 * @param msg: amqp.Message | null
 */
export async function handleMessage(
  rabbitmqConfig: RabbitMQConfig,
  db: DatabaseClient,
  axelarClient: AxelarClient,
  channel: amqp.Channel,
  msg: amqp.Message | null
) {
  if (msg?.content) {
    try {
      const btcTransaction: BtcTransaction = JSON.parse(msg.content.toString());
      // -util. util for stop consume at specific height
      if (
        rabbitmqConfig.stopHeight != null &&
        rabbitmqConfig.stopHeight > 0 &&
        btcTransaction.staking_start_height > rabbitmqConfig.stopHeight
      ) {
        logger.info(
          `[handleScalarRabbitmqEvent] Stop consume at height: ${rabbitmqConfig.stopHeight}, current height: ${btcTransaction.staking_start_height}`
        );
        channel.ack(msg);
        return;
      }
      //0. Create event object
      const btcEvent: BtcEventTransaction = createBtcEventTransaction(
        rabbitmqConfig.sourceChain,
        btcTransaction
      );

      logger.debug(`[RabbitMQ] Received BTC Event: ${JSON.stringify(btcEvent)}`);

      try {
        // 1. Connect to the database
        await db.connect();
        // 2. Create the event in the database
        await db.createBtcCallContractEvent(btcEvent);
      } catch (e) {
        logger.error('Failed to create btc event in the database:', e);
      }
      // 3. Wait for the event to be finalized - get enough confirmations
      // await ev.waitForFinality();
      // 4. Handle the event by sending the confirm tx to the axelar network
      await handleBtcEvent(axelarClient, channel, btcEvent, msg);
    } catch (err) {
      logger.error('Failed to process message:', err);
      channel.nack(msg, false, false);
    } finally {
      try {
        await db.disconnect();
      } catch (e) {
        logger.error('Failed to disconnect from the database:', e);
      }
    }
  }
}
export async function handleBtcEvent(
  axelarClient: AxelarClient,
  channel: amqp.Channel,
  content: BtcEventTransaction,
  msg: amqp.Message
) {
  const confirmTx = await axelarClient.confirmEvmTx(content.sourceChain, content.txHash);
  if (confirmTx) {
    logger.info(`[RabbitMQ][Scalar]: Confirmed BTC Event:
      tx_hash: ${content.txHash},
      source_chain: ${content.sourceChain},
      confirm_tx_hash: ${'0x' + confirmTx.transactionHash}
      `);

    channel.ack(msg);
  } else {
    logger.error(
      `[RabbitMQ][Scalar]: Failed to confirm BTC Event: tx_hash: ${content.txHash}`
    );
    channel.nack(msg, false, false);
  }
}
export async function startRabbitMQRelayer(
  rabbitmqConfig: RabbitMQConfig,
  db: DatabaseClient,
  axelarClient: AxelarClient
) {
  // Create a connection and a channel
  // Connect to the RabbitMQ server if the RabbitMQ is enabled
  if (rabbitmqConfig.enabled !== false) {
    const connectionString = `amqp://${rabbitmqConfig.user}:${rabbitmqConfig.password}@${rabbitmqConfig.host}:${rabbitmqConfig.port}`;
    const queue = rabbitmqConfig.queue;
    const options = {
      durable: true,
      arguments: {
        'x-queue-type': rabbitmqConfig.queueType || 'quorum',
        'x-dead-letter-exchange': 'common_dlx',
        'x-dead-letter-routing-key': rabbitmqConfig.routingKey || 'active_vault_queue_routing_key',
      },
    };
    amqp.connect(connectionString, (connectErr, connection: Connection) => {
      connection.createChannel((channelErr, channel: Channel) => {
        if (channelErr) {
          logger.error('Failed to create a channel:', channelErr);
          return;
        }
        logger.info('RabbitMQ connected');
        // Ensure the queue exists
        channel.assertQueue(queue, options);

        // Ensure that only one message must be processed at a time by the consumer
        channel.prefetch(1);

        logger.info(`Consume messages from the queue ${queue}`);
        channel.consume(
          queue,
          async (msg: amqp.Message | null) =>
            await handleMessage(rabbitmqConfig, db, axelarClient, channel, msg),
          { noAck: false }
        );
      });
    });
  }
}
