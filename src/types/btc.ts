export interface BtcEventTransaction {
  txHash: string;
  logIndex: number;
  blockNumber: number;
  sender: string;
  sourceChain: string;
  destinationChain: string;
  destinationContractAddress: string;
  mintingAmount: string;
  payload: string;
  payloadHash: string;
  args: BtcTransaction;
  stakerPublicKey: string;
  vaultTxHex: string;
}
export interface BtcTransaction {
  event_type: number;
  vault_tx_hash_hex: string;
  vault_tx_hex: string;
  staker_pk_hex: string;
  finality_provider_pk_hex: string;
  staking_value: number;
  staking_start_height: number;
  staking_start_timestamp: number;
  staking_output_index: number;
  chain_id: string;
  chain_id_user_address: string; // User address on the destination chain for receiving the minted tokens
  chain_id_smart_contract_address: string; // Smnart contract address on the destination chain for handling minting logic
  amount_minting: string;
  is_overflow: boolean;
}

export interface BtcTransactionReceiptDetail {
  address: string;
  parent_descs: any[];
  category: string;
  amount: number;
  label: string;
  vout: number;
}

export interface BtcTransactionReceipt {
  amount: number;
  confirmations: number;
  blockhash: string;
  blockheight: number;
  blockindex: number;
  blocktime: number;

  txid: string;
  wtxid: string;
  walletconflicts: string[];

  time: number;
  timereceived: number;
  'bip125-replaceable': string;

  details: BtcTransactionReceiptDetail[];
  trusted: boolean;
  hex: string;
}
