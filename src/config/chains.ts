import { ethers, logger } from 'ethers';
import fs from 'fs';
import { env } from '.';
import {
  AxelarConfig,
  BtcNetworkConfig,
  CosmosNetworkConfig,
  EvmNetworkConfig,
  RabbitMQConfig,
} from './types';

const getConfig = () => {
  const chainEnv = env.CHAIN_ENV;
  const dir = `data/${chainEnv}`;
  switch (chainEnv) {
    case 'local':
      logger.info('[getConfig] Using local configuration');
      break;
    case 'devnet':
      logger.info('[getConfig] Using devnet configuration');
      break;
    case 'testnet':
      logger.info('[getConfig] Using testnet configuration');
      break;
    default:
      logger.throwError('[getConfig] Invalid CHAIN_ENV', ethers.errors.INVALID_ARGUMENT);
  }

  const axelarConfig = fs.readFileSync(`${dir}/axelar.json`, 'utf8');
  const axelarConfigJson = JSON.parse(axelarConfig) as AxelarConfig;

  const btcConfig = fs.readFileSync(`${dir}/btc.json`, 'utf8');
  const btcConfigJson = JSON.parse(btcConfig) as BtcNetworkConfig[];

  const cosmosConfig = fs.readFileSync(`${dir}/cosmos.json`, 'utf8');
  const cosmosConfigJson = JSON.parse(cosmosConfig) as CosmosNetworkConfig[];

  const evmConfig = fs.readFileSync(`${dir}/evm.json`, 'utf8');
  const evmConfigJson = JSON.parse(evmConfig) as EvmNetworkConfig[];

  const rabbitmqConfig = fs.readFileSync(`${dir}/rabbitmq.json`, 'utf8');
  const rabbitmqConfigJson = JSON.parse(rabbitmqConfig) as RabbitMQConfig[];
  logger.debug(`[getConfig] axelarConfigJson: ${JSON.stringify(axelarConfigJson)}`);
  logger.debug(`[getConfig] btcConfigJson: ${JSON.stringify(btcConfigJson)}`);
  logger.debug(`[getConfig] cosmosConfigJson: ${JSON.stringify(cosmosConfigJson)}`);
  logger.debug(`[getConfig] evmConfigJson: ${JSON.stringify(evmConfigJson)}`);
  logger.debug(`[getConfig] rabbitmqConfigJson: ${JSON.stringify(rabbitmqConfigJson)}`);

  return {
    axelar: axelarConfigJson,
    btc: btcConfigJson,
    cosmos: cosmosConfigJson,
    evm: evmConfigJson,
    rabbitmq: rabbitmqConfigJson,
  };
};

getConfig();

const { axelar, btc, cosmos, evm, rabbitmq } = getConfig();

function getEvmPrivateKey(network: string): string {
  const filePath = `${env.CONFIG_CHAINS}/${network}/config.json`;
  const data = fs.readFileSync(filePath, 'utf8');
  const networkConfig = JSON.parse(data);
  let privateKey = env.EVM_PRIVATE_KEY;
  if (networkConfig.privateKey) {
    privateKey = networkConfig.privateKey;
  } else if (networkConfig.mnemonic && networkConfig.walletIndex) {
    const hdWallet = ethers.Wallet.fromMnemonic(
      networkConfig.mnemonic,
      `m/44'/60'/0'/0/${networkConfig.walletIndex}`
    );
    privateKey = hdWallet.privateKey;
  }
  logger.debug(`[getEvmPrivateKey] network: ${network}, privateKey: ${privateKey}`);
  return privateKey;
}
export const cosmosChains: CosmosNetworkConfig[] = cosmos.map((chain) => ({
  ...chain,
  mnemonic: env.AXELAR_MNEMONIC,
}));

export const axelarChain: CosmosNetworkConfig = {
  ...axelar,
  mnemonic: env.AXELAR_MNEMONIC,
};
//Todo: Use separate private key for each network
//First version run with docker version

export const evmChains: EvmNetworkConfig[] = evm.map((chain) => ({
  ...chain,
  privateKey: getEvmPrivateKey(chain.id),
}));

export const btcChains: BtcNetworkConfig[] = btc.map((chain) => ({
  ...chain,
  privateKey: env.BTC_PRIVATE_KEY,
}));

export const rabbitmqConfigs: RabbitMQConfig[] = rabbitmq;
