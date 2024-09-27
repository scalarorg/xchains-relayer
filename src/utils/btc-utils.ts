import { Network, Psbt, networks } from 'bitcoinjs-lib';
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
