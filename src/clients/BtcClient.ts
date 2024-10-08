import Client from 'bitcoin-core-ts';
import { BtcNetworkConfig } from 'config';
import { logger } from '../logger';
import { env } from '..';

export class BtcClient {
  config: BtcNetworkConfig;
  client: Client;
  private maxRetry: number;
  private retryDelay: number;
  constructor(config: BtcNetworkConfig, _maxRetry = env.MAX_RETRY, _retryDelay = env.RETRY_DELAY) {
    this.config = config;
    logger.info(`[BtcClient] Config: ${JSON.stringify(config)}`);
    this.client = new Client({
      network: config.network,
      host: config.host,
      username: config.user,
      password: config.password,
      port: config.port,
      ssl: config.ssl,
      wallet: 'legacy',
    });

    


    // this.wallet = new Wallet(
    // chain.privateKey,
    // new ethers.providers.JsonRpcProvider(chain.rpcUrl)
    // );
    // this.gateway = IAxelarGateway__factory.connect(chain.gateway, this.wallet);
    this.maxRetry = _maxRetry;
    this.retryDelay = _retryDelay;
    // this.chainId = chain.id;
    // this.finalityBlocks = chain.finality;
  }
  public isSigner(): boolean {
    return this.config.type.toLowerCase() == 'signer';
  }
  public isBroadcast(): boolean {
    return this.config.type.toLowerCase() == 'broadcast';
  }
  public async getServiceAddress(): Promise<string> {
    return this.config.address || '';
  }
  /*
   * Call to the offline node to sign rawtransaction with default generated wallet
   */
  public async signRawTx(txHex: string): Promise<any> {
    try {
      const response = await this.client.command('signrawtransactionwithwallet', txHex);
      return response;
    } catch (e) {
      logger.error('[signRawTx] Failed to signRawTx: ', e);
      throw e;
    }
  }

  /*
   * Submit transaction to public BTC chain
   */
  public async submitSignedTx(txHex: string): Promise<any> {
    try {
      const response = await this.client.command('sendrawtransaction', txHex);
      return response;
    } catch (e) {
      logger.error('[submitSignedTx] Failed to submitSignedTx: ', e);
      throw e;
    }
  }

  private async unlockWallet(passphrase: string, timeout: number): Promise<void> {
    try {
      await this.client.command('walletpassphrase', passphrase, timeout);
    } catch (e) {
      logger.error('[unlockWallet] Failed to unlock wallet: ', e);
      throw e;
    }
  }

  public async getTransaction(txId: string): Promise<any> {
    try {
      const response = await this.client.command('gettransaction', txId);
      return response;
    } catch (e) {
      logger.error('[getTxInfo] Failed to getTxInfo: ', e);
      throw e;
    }
  }

  /*
   * Dump private key from wallet - WIF format
   */
  public async getPrivKeyFromLegacyWallet(address: string): Promise<any> {
    try {
      await this.unlockWallet('passphrase', 60);

      logger.info(`[getPrivKeyFromLegacyWallet] Dumping private key for address: ${address}`);

      const response = await this.client.command('dumpprivkey', address);

      return response;
    } catch (e) {
      logger.error('[getPrivKeyFromLegacyWallet] Failed to getPrivKeyFromLegacyWallet: ', e);
      throw e;
    }
  }
  /*
   * Test mempool acceptance of a raw transaction
   */
  public async testMempoolAcceptance(txHex: string): Promise<any> {
    try {
      const response = await this.client.command('testmempoolaccept', [txHex]);
      return response;
    } catch (e) {
      logger.error('[testMempoolAcceptance] Failed to testMempoolAcceptance: ', e);
      throw e;
    }
  }
}
