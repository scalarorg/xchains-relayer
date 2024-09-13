// Testnet
import testnetAxelar from '../../data/testnet/axelar.json';
import testnetCosmos from '../../data/testnet/cosmos.json';
import testnetEvm from '../../data/testnet/evm.json';
import testnetBtc from '../../data/testnet/btc.json';
import testnetRabbitmq from '../../data/testnet/rabbitmq.json';
// Devnet
import devnetAxelar from '../../data/devnet/axelar.json';
import devnetCosmos from '../../data/devnet/cosmos.json';
import devnetEvm from '../../data/devnet/evm.json';
import devnetBtc from '../../data/devnet/btc.json';
import devnetRabbitmq from '../../data/devnet/rabbitmq.json';
// Local
import localAxelar from '../../data/local/axelar.json';
import localCosmos from '../../data/local/cosmos.json';
import localEvm from '../../data/local/evm.json';
import localBtc from '../../data/local/btc.json';
import localRabbitmq from '../../data/local/rabbitmq.json';


import { env } from '.';
import { BtcNetworkConfig, CosmosNetworkConfig, EvmNetworkConfig, RabbitMQConfig } from './types';

const cosmos = env.CHAIN_ENV === 'local' ? localCosmos :(env.CHAIN_ENV === 'devnet' ? devnetCosmos : testnetCosmos);
const axelar = env.CHAIN_ENV === 'local' ? localAxelar : (env.CHAIN_ENV === 'devnet' ? devnetAxelar : testnetAxelar);
const evm = env.CHAIN_ENV === 'local' ? localEvm : (env.CHAIN_ENV === 'devnet' ? devnetEvm : testnetEvm);
const btc = env.CHAIN_ENV === 'local' ? localBtc : (env.CHAIN_ENV === 'devnet' ? devnetBtc : testnetBtc);
const rabbitmq = env.CHAIN_ENV === 'local' ? localRabbitmq : (env.CHAIN_ENV === 'devnet' ? devnetRabbitmq : testnetRabbitmq);
export const cosmosChains: CosmosNetworkConfig[] = cosmos.map((chain) => ({
  ...chain,
  mnemonic: env.AXELAR_MNEMONIC,
}));

export const axelarChain: CosmosNetworkConfig = {
  ...axelar,
  mnemonic: env.AXELAR_MNEMONIC,
};

export const evmChains: EvmNetworkConfig[] = evm.map((chain) => ({
  ...chain,
  privateKey: env.EVM_PRIVATE_KEY,
}));

export const btcChains: BtcNetworkConfig[] = btc.map((chain) => ({
  ...chain,
  privateKey: env.BTC_PRIVATE_KEY,
}));

export const rabbitmqConfigs: RabbitMQConfig[] = rabbitmq;