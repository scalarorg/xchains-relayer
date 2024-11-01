import { AxelarClient, DatabaseClient } from '../clients';
import { evmChains } from '../config';
import { logger } from '../logger';
import { BtcEventTransaction, BtcTransaction } from '../types';
import { ethers } from 'ethers';
import net from 'net';

const ElectsConfig = {
  socketPath: '/tmp/electrs.sock',
  sourceChain: 'testnet4',
  stopHeight: 730000,
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
  message: VaultTxMessage
): BtcEventTransaction {
  logger.debug(`[Elects Event Parser]: ${JSON.stringify(message)}`);

  const toAddress = message.destination_recipient_address;
  
  const chainId = message.destination_chain_id;
  const amount = message.amount;
  const blockTime = message.timestamp;
  const payload = ethers.utils.defaultAbiCoder.encode(
    ['address', 'uint256', 'uint64'],
    [toAddress, amount, blockTime]
  );

  logger.debug(`[RabbitMQ][BTC Event Parser]: payload: ${payload}`);

  const payloadHash = ethers.utils.keccak256(payload);

  logger.debug(`[RabbitMQ][BTC Event Parser]: payloadHash: ${payloadHash}`);

  const destinationChain = getChainNameById(chainId.toString());
  if (destinationChain === undefined) {
    throw new Error(`[RabbitMQ][BTC Event Parser]: destination chain not found: ${chainId}`);
  }
  const btcTransaction: BtcTransaction = {
    event_type: 0,
    vault_tx_hash_hex: '',
    vault_tx_hex: '',
    staker_pk_hex: '',
    finality_provider_pk_hex: '',
    staking_value: 0,
    staking_start_height: 0,
    staking_start_timestamp: 0,
    staking_output_index: 0,
    chain_id: '',
    chain_id_user_address: '',
    chain_id_smart_contract_address: '',
    amount_minting: '',
    is_overflow: false
  };
  const btcEvent: BtcEventTransaction = {
    txHash: `0x${message.txid}`,
    logIndex: 0,
    blockNumber: Number(message.confirmed_height),
    mintingAmount: message.amount.toString(),
    sender: message.staker_address,
    sourceChain: ElectsConfig.sourceChain,
    destinationChain,
    destinationContractAddress: message.destination_contract_address,
    payload,
    payloadHash,
    args: btcTransaction,
    stakerPublicKey: message.staker_pubkey,
    vaultTxHex: message.tx_content,
  };
  return btcEvent;
}
  
interface VaultTxMessage {
  confirmed_height: number;
  txid: string;
  tx_position: number;
  staker_address: string;
  staker_pubkey: string;
  amount: number;
  destination_chain_id: number;
  destination_contract_address: string;
  destination_recipient_address: string;
  //Hex string of the vault tx
  tx_content: string;
  timestamp: number;
}

interface PingPong {
  type: 'ping' | 'pong';
}

function isPingPongMessage(message: any): message is PingPong {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    (message.type === 'ping' || message.type === 'pong')
  );
}
function isVaultTxMessage(message: any): message is VaultTxMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'txid' in message &&
    'destination_chain_id' in message
  );
}
export class ElectrumRelayer {
  private socket: net.Socket;
  private readonly socketPath: string = ElectsConfig.socketPath;
  private db: DatabaseClient;
  private axelarClient: AxelarClient;

  constructor(db: DatabaseClient, axelarClient: AxelarClient) {
    this.socket = new net.Socket();
    this.db = db;
    this.axelarClient = axelarClient;
  }

  public async start(): Promise<void> {
    this.socket.connect({ path: this.socketPath }, () => {
      console.log('[ElectsRelayer] Connected to Unix socket');
    });

    this.socket.on('data', async (data) => {
      try {
        const parsedMessage = JSON.parse(data.toString());
        console.log('[ElectsRelayer] Received data:', parsedMessage);
        // Add ping-pong handler
       if (isPingPongMessage(parsedMessage)) {
          console.log('Received ping-pong message:', parsedMessage.type);
          if (parsedMessage.type === 'ping') {
            const response: PingPong = {
              type: 'pong'
            };
            this.socket.write(JSON.stringify(response));
          }
        } else if (isVaultTxMessage(parsedMessage)) {
          await this.handleVaultTxMessage(parsedMessage);
          const response: PingPong = {
            type: 'pong',
            };
            this.socket.write(JSON.stringify(response));
        }

        //const message = JSON.parse(data.toString()) as ElectrsMessage;
        //await this.handleMessage(message);
      } catch (error) {
        console.error('[ElectsRelayer] Error processing message:', error);
      }
    });

    this.socket.on('error', (error) => {
      console.error('[ElectsRelayer] Socket error:', error);
    });

    this.socket.on('close', () => {
      console.log('[ElectsRelayer] Socket connection closed');
      // Attempt to reconnect after delay
      setTimeout(() => this.start(), 5000);
    });
  }

  private async handleVaultTxMessage(message: VaultTxMessage): Promise<void> {
    console.log('[ElectsRelayer] Received vaulttx message:', message);
    //0. Create event object
    const btcEvent: BtcEventTransaction = createBtcEventTransaction(
      message
    );
    try {
      // 1. Connect to the database
      await this.db.connect();
      // 2. Create the event in the database
      await this.db.createBtcCallContractEvent(btcEvent);
      // 4. Handle the event by sending the confirm tx to the axelar network
      const confirmTx = await this.axelarClient.confirmEvmTx(btcEvent.sourceChain, btcEvent.txHash);
      if (confirmTx) {
        logger.info(`[ElectsRelayer]: Confirmed Elects Event:
          tx_hash: ${btcEvent.txHash},
          source_chain: ${btcEvent.sourceChain},
          confirm_tx_hash: ${'0x' + confirmTx.transactionHash}
        `);
      }
    } catch (err) {
      logger.error('[ElectsRelayer] Failed to process message:', err);
    } finally {
      try {
        await this.db.disconnect();
      } catch (e) {
        logger.error('[ElectsRelayer] Failed to disconnect from the database:', e);
      }
    }
  }
}

// Create and export instance
// export const electrumRelayer = new ElectrumRelayer(); 
// export async function startElectrumRelayer() {
//   await electrumRelayer.start();
// }
