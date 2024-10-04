export interface CosmosNetworkConfig {
  chainId: string;
  rpcUrl: string;
  lcdUrl: string;
  ws: string;
  denom: string;
  mnemonic: string;
  gasPrice: string;
}

export interface EvmNetworkConfig {
  chainId: string; // chain id in number, parsed from btcTransaction.chain_id
  id: string;
  name: string;
  rpcUrl: string;
  gateway: string;
  finality: number;
  privateKey: string;
}
export interface BtcNetworkConfig {
  network: string;
  id: string;
  chainId: string;
  type: string; //signer or broadcast
  host: string;
  port: number;
  user: string;
  password: string;
  ssl?: boolean;
  privateKey?: string;
  address?: string;
}
export interface RabbitMQConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  queue: string;
  queueType: string;
  routingKey: string;
  sourceChain: string;
  enabled?: boolean;
  stopHeight?: number;
}

export interface AxelarConfig {
  chainId: string;
  denom: string;
  gasPrice: string;
  rpcUrl: string;
  lcdUrl: string;
  ws: string;
}
