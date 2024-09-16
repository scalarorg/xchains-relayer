import 'dotenv/config';

export const env = {
  DEV: process.env.DEV,
  CONFIG_DIR: process.env.CONFIG_DIR || '/app/chains',
  AXELAR_MNEMONIC: process.env.AXELAR_MNEMONIC || '',
  EVM_PRIVATE_KEY: process.env.EVM_PRIVATE_KEY || '',
  BTC_PRIVATE_KEY: process.env.BCT_PRIVATE_KEY || '',
  GAS_LIMIT: parseInt(process.env.GAS_LIMIT || '1000000'),
  MAX_RETRY: parseInt(process.env.MAX_RETRY || '5'),
  RETRY_DELAY: parseInt(process.env.RETRY_DELAY || '3000'),
  HERMES_METRIC_URL: process.env.HERMES_METRIC_URL || 'http://localhost:3001/metrics',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/relayer',
  PORT: process.env.PORT || 3000,
  DD_API_KEY: process.env.DD_API_KEY || '',
  CHAIN_ENV: process.env.CHAIN_ENV || 'testnet',
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  
};

export * from './chains';
export * from './types';
