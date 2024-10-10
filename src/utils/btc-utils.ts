import { BtcTransactionReceipt } from './../types/btc';
import { Network, Psbt, networks } from 'bitcoinjs-lib';
import { env } from '../config';
import { ECPairAPI, ECPairFactory, TinySecp256k1Interface } from 'ecpair';

// You need to provide the ECC library. The ECC library must implement
// all the methods of the `TinySecp256k1Interface` interface.
let ECPair: ECPairAPI;

(async () => {
  const tinysecp: TinySecp256k1Interface = await import('tiny-secp256k1');
  ECPair = ECPairFactory(tinysecp);
})();

// @param psbtb64: the transaction to sign in base64 format
// @param serviceAddress: the address of the service
// @param privKey: the private key of the service
// @returns the signed transaction from psbtb64
export async function signPsbt(
  psbtb64: string,
  serviceAddress: string,
  privKey: string
): Promise<string> {
  let network = null;
  try {
    network = getAddressType(serviceAddress)[1];
  } catch (e) {
    if (
      serviceAddress.startsWith('bcrt1q') ||
      serviceAddress.startsWith('bcrt1p') ||
      serviceAddress.startsWith('m') ||
      serviceAddress.startsWith('m') ||
      serviceAddress.startsWith('3')
    ) {
      network = networks.regtest;
    } else {
      throw new Error(`Failed to get network: ${e}`);
    }
  }

  try {
    const service_keyPair = ECPair.fromWIF(privKey, network);
    const psbt = Psbt.fromBase64(psbtb64, { network });

    psbt.signInput(0, service_keyPair);
    psbt.finalizeAllInputs();
    return psbt.extractTransaction().toHex();
  } catch (e) {
    throw new Error(`Failed to sign tx: ${e}`);
  }
}

export enum AddressType {
  P2PKH,
  P2WPKH,
  P2TR,
  P2SH_P2WPKH,
}
export function getAddressType(address: string): [AddressType, Network] {
  if (address.startsWith('bc1q')) {
    return [AddressType.P2WPKH, networks.bitcoin];
  } else if (address.startsWith('bc1p')) {
    return [AddressType.P2TR, networks.bitcoin];
  } else if (address.startsWith('1')) {
    return [AddressType.P2PKH, networks.bitcoin];
  } else if (address.startsWith('3')) {
    return [AddressType.P2SH_P2WPKH, networks.bitcoin];
  }
  // testnet
  else if (address.startsWith('tb1q')) {
    return [AddressType.P2WPKH, networks.testnet];
  } else if (address.startsWith('m') || address.startsWith('n')) {
    return [AddressType.P2PKH, networks.testnet];
  } else if (address.startsWith('2')) {
    return [AddressType.P2SH_P2WPKH, networks.testnet];
  } else if (address.startsWith('tb1p')) {
    return [AddressType.P2TR, networks.testnet];
  }

  throw new Error(`Unknown address: ${address}`);
}

interface BitcoinTransaction {
  txid: string;
  version: number;
  locktime: number;
  vin: TransactionInput[];
  vout: TransactionOutput[];
  size: number;
  weight: number;
  sigops: number;
  fee: number;
  status: TransactionStatus;
}

interface TransactionInput {
  txid: string;
  vout: number;
  prevout: PrevOut;
  scriptsig: string;
  scriptsig_asm: string;
  witness: string[];
  is_coinbase: boolean;
  sequence: number;
  inner_witnessscript_asm: string;
}

interface PrevOut {
  scriptpubkey: string;
  scriptpubkey_asm: string;
  scriptpubkey_type: string;
  scriptpubkey_address: string;
  value: number;
}

interface TransactionOutput {
  scriptpubkey: string;
  scriptpubkey_asm: string;
  scriptpubkey_type: string;
  scriptpubkey_address: string;
  value: number;
}

interface TransactionStatus {
  confirmed: boolean;
  block_height: number;
  block_hash: string;
  block_time: number;
}

export const getMempoolTx = async (txID: string, network: 'mainnet' | 'testnet' | 'regtest') => {
  const prefix = network === 'mainnet' || network === 'regtest' ? '' : '/testnet';
  const endpoint = `${env.MEMPOOL_API}${prefix}/api/tx/${txID}`;

  console.log({ network });
  console.log(`[getMempoolTx] ${endpoint}`);

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
    });
    const text = await res.text();
    console.log('Response:', text);
    const json = await res.json();
    console.log('JSON:', json);
    // rest of your code
  } catch (error) {
    console.error(error);
    return null;
  }
};
