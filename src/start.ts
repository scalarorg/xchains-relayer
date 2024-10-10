import { startAPIServer } from './api';
import { axelarChain, btcChains, cosmosChains, evmChains, rabbitmqConfigs } from './config/chains';
import { logger } from './logger';
import { startRelayer } from './relayer';
logger.info('Starting relayer api server...');

const logConfig = async () => {
  console.log({
    btcChains,
    evmChains,
    axelarChain,
    rabbitmqConfigs,
    cosmosChains,
  });
};

logConfig();
startAPIServer();
startRelayer();
