import { Wallet, ethers } from 'ethers';
import { EvmNetworkConfig } from 'config';
import {
  IAxelarGateway__factory,
  IAxelarGateway,
  IAxelarExecutable,
  IAxelarExecutable__factory,
} from '../types/contracts';
import { env } from '..';
import { sleep } from './sleep';
import { logger } from '../logger';

export class EvmClient {
  private wallet: Wallet;
  private gateway: IAxelarGateway;
  private maxRetry: number;
  private retryDelay: number;
  private finalityBlocks: number;
  private chainConfig: EvmNetworkConfig;
  chainId: string;

  constructor(
    chain: EvmNetworkConfig,
    _maxRetry = env.MAX_RETRY,
    _retryDelay = env.RETRY_DELAY
  ) {
    this.chainConfig = chain;
    this.wallet = new Wallet(
      chain.privateKey,
      new ethers.providers.JsonRpcProvider(chain.rpcUrl)
    );
    this.gateway = IAxelarGateway__factory.connect(chain.gateway, this.wallet);
    this.maxRetry = _maxRetry;
    this.retryDelay = _retryDelay;
    this.chainId = chain.name;
    this.finalityBlocks = chain.finality;
  }

  public getSenderAddress() {
    return this.wallet.address;
  }

  public waitForFinality(txHash: string) {
    return this.wallet.provider.waitForTransaction(txHash, this.finalityBlocks);
  }

  public async gatewayExecute(executeData: string) {
    const tx = {
      to: this.gateway.address,
      data: executeData,
      gasLimit: env.GAS_LIMIT,
    }
    logger.debug(`[EvmClient.gatewayExecute] to: ${tx.to}, data: ${tx.data}, gasLimit ${tx.gasLimit}`);
    return this.submitTx(tx).catch((e) => {
      logger.error(`[EvmClient.gatewayExecute] Failed ${e.message}`);
      return undefined;
    });
  }

  public isExecuted(commandId: string) {
    return this.gateway.isCommandExecuted(commandId);
  }

  // warning: this function should be called after the command is executed, otherwise it will always return false
  public async isCallContractExecuted(
    commandId: string,
    sourceChain: string,
    sourceAddress: string,
    contractAddress: string,
    payloadHash: string
  ) {
    return this.gateway
      .isContractCallApproved(
        commandId,
        sourceChain,
        sourceAddress,
        contractAddress,
        payloadHash
      )
      .then((unexecuted) => !unexecuted);
  }

  // warning: this function should be called after the command is executed, otherwise it will always return false
  public async isCallContractWithTokenExecuted(
    commandId: string,
    sourceChain: string,
    sourceAddress: string,
    contractAddress: string,
    payloadHash: string,
    symbol: string,
    amount: string
  ) {
    return this.gateway
      .isContractCallAndMintApproved(
        commandId,
        sourceChain,
        sourceAddress,
        contractAddress,
        payloadHash,
        symbol,
        amount
      )
      .then((unexecuted) => !unexecuted);
  }

  public async execute(
    contractAddress: string,
    commandId: string,
    sourceChain: string,
    sourceAddress: string,
    payload: string
  ) {
    const executable: IAxelarExecutable = IAxelarExecutable__factory.connect(
      contractAddress,
      this.wallet
    );
    return executable.populateTransaction
      .execute(commandId, sourceChain, sourceAddress, payload)
      .then((tx) => this.submitTx(tx))
      .catch((e) => {
        logger.error(`[EvmClient.execute] Failed ${JSON.stringify(e)}`);
        return undefined;
      });
  }

  public async executeWithToken(
    destContractAddress: string,
    commandId: string,
    sourceChain: string,
    sourceAddress: string,
    payload: string,
    tokenSymbol: string,
    amount: string
  ) {
    const executable: IAxelarExecutable = IAxelarExecutable__factory.connect(
      destContractAddress,
      this.wallet
    );
    return executable.populateTransaction
      .executeWithToken(
        commandId,
        sourceChain,
        sourceAddress,
        payload,
        tokenSymbol,
        amount
      )
      .then((tx) => this.submitTx(tx))
      .catch((e) => {
        logger.error(
          `[EvmClient.executeWithToken] Failed ${JSON.stringify(e)}`
        );
        return undefined;
      });
  }

  private async submitTx(
    tx: ethers.providers.TransactionRequest,
    retryAttempt = 0
  ): Promise<ethers.providers.TransactionReceipt> {
    // submit tx with retries
    if (retryAttempt >= this.maxRetry) throw new Error('Max retry exceeded');
    //TaiVV 2024-09-14: Add gasLimit to tx
    logger.debug(`tx: ${JSON.stringify(tx)}`); 
    if (!tx.gasLimit) {
      tx.gasLimit = env.GAS_LIMIT
    }
    return this.wallet
      .sendTransaction(tx)
      .then((t) => {
        logger.debug(JSON.stringify(t));
        return t.wait()
      })
      .catch(async (e) => {
        console.error("Error submitting tx", e);
        logger.error(
          `[EvmClient.submitTx] Failed with Provider: ${this.chainConfig.rpcUrl }, Wallet address: ${this.wallet.address} to: ${tx.to} data: ${tx.data}`
        );
        await sleep(this.retryDelay);
        logger.debug(`Retrying tx: ${retryAttempt + 1}`);
        return this.submitTx(tx, retryAttempt + 1);
      });
  }
}
