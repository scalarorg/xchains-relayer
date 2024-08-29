import { AxelarClient, DatabaseClient } from '../clients';
import { rabbitmqConfig } from '../config';
import { logger } from '../logger';
import amqp, { Connection, Channel } from 'amqplib/callback_api';
import { BtcEventTransaction, BtcTransaction } from '../types';
import { ethers } from 'ethers';

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
/*
 * Create a BtcEventTransaction object from a BtcTransaction object
 * @param btcTransaction: BtcTransaction
 * @returns BtcEventTransaction
 */
export function createBtcEventTransaction(btcTransaction: BtcTransaction): BtcEventTransaction {
  logger.info(`[createBtcEventTransaction] txHash: ${btcTransaction.vault_tx_hash_hex}`);
  const toAddress = `0x${Buffer.from(btcTransaction.chain_id_user_address, 'base64').toString(
    'hex'
  )}`;
  logger.info(`[createBtcEventTransaction] amount_minting: ${btcTransaction.amount_minting}`);
  const amount_decode = `0x${Buffer.from(btcTransaction.amount_minting, 'base64').toString('hex')}`;
  const amount = ethers.utils.parseUnits(String(Number(amount_decode)), 0);

   logger.info(`[createBtcEventTransaction] toAddress: ${toAddress}, amount : ${amount}`);
  const payload = ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [toAddress, amount]);

  const payloadHash = ethers.utils.keccak256(payload);

  let destinationChain;
  switch (String(Number(Buffer.from(btcTransaction.chain_id, 'base64').toString('hex')))) {
    case '11155111':
      destinationChain = 'ethereum-sepolia';
      break;
    default:
      destinationChain = 'ethereum-sepolia';
      break;
  }

  const btcEvent: BtcEventTransaction = {
    txHash: `0x${btcTransaction.vault_tx_hash_hex}`,
    logIndex: 0,
    blockNumber: 0,
    sender: `0x${Buffer.from(btcTransaction.chain_id_user_address, 'base64').toString('hex')}`,
    sourceChain: rabbitmqConfig.sourceChain,
    destinationChain,
    destinationContractAddress: `0x${Buffer.from(
      btcTransaction.chain_id_smart_contract_address,
      'base64'
    ).toString('hex')}`,
    payload,
    payloadHash,
    args: btcTransaction,
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
  db: DatabaseClient,
  axelarClient: AxelarClient,
  channel: amqp.Channel,
  msg: amqp.Message | null
) {
  if (msg?.content) {
    try {
      const btcTransaction: BtcTransaction = JSON.parse(msg.content.toString());
      // -util. util for stop consume at specific height
      if (rabbitmqConfig.stopHeight != null &&  rabbitmqConfig.stopHeight > 0 && btcTransaction.staking_start_height > rabbitmqConfig.stopHeight) {
        logger.info(
          `[handleScalarRabbitmqEvent] Stop consume at height: ${rabbitmqConfig.stopHeight}, current height: ${btcTransaction.staking_start_height}`
        );
        channel.ack(msg);
        return;
      }
      //0. Create event object
      const btcEvent: BtcEventTransaction = createBtcEventTransaction(btcTransaction);
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
  logger.info(`[handleScalarRabbitmqEvent] txHash: ${content.txHash}`);
  const confirmTx = await axelarClient.confirmEvmTx(content.sourceChain, content.txHash);
  if (confirmTx) {
    logger.info(`[handleScalarRabbitmqEvent] Confirmed: ${'0x' + confirmTx.transactionHash}`);
    channel.ack(msg);
  } else {
    logger.error(`[handleScalarRabbitmqEvent] Failed to confirm: ${content.txHash}`);
    channel.nack(msg, false, false);
  }
}
export async function startRabbitMQRelayer(db: DatabaseClient, axelarClient: AxelarClient) {
  // Create a connection and a channel
  // Connect to the RabbitMQ server if the RabbitMQ is enabled
  if (rabbitmqConfig.enabled !== false) {
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
          async (msg: amqp.Message | null) => await handleMessage(db, axelarClient, channel, msg),
          { noAck: false }
        );
      });
    });
  }
}
