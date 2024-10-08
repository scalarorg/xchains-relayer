import { axelarChain, btcChains, cosmosChains, evmChains, rabbitmqConfigs } from './config/chains';
import { startAPIServer } from './api';
import { logger } from './logger';
import { startRelayer } from './relayer';
logger.info('Starting relayer api server...');

const logConfig = () => {
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
