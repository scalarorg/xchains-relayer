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
    this.client = new Client({
      network: config.network,
      host: config.host,
      username: config.user,
      password: config.password,
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

  /*
   * Dump private key from wallet - WIF format
   */
  public async getPrivKeyFromLegacyWallet(address: string): Promise<any> {
    try {
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
