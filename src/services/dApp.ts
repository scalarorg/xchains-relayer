import { BtcClient } from '../clients/BtcClient';
import { signPsbt } from '../utils/btc-utils';
import { logger } from '../logger';

export async function processBurningTxs(
  btcSignerClient: BtcClient,
  btcBroadcastClient: BtcClient,
  psbtb64: string
): Promise<void> {
  await validateBurningTxs(btcBroadcastClient, psbtb64);
  await signAndBroadcasting(btcSignerClient, btcBroadcastClient, psbtb64);
}

// TODO: parsing and verify burning txs
async function validateBurningTxs(btcBroadcastClient: BtcClient, psbtb64: string): Promise<void> {
  try {
    // await parseTx(psbtb64);
    // await verifyTx(client, psbtb64);
  } catch (e) {
    throw new Error(`Failed to validate tx: ${e}`);
  }
}

async function signAndBroadcasting(
  btcSignerClient: BtcClient,
  btcBroadcastClient: BtcClient,
  psbtb64: string
): Promise<void> {
  try {
    const serviceAddress = await btcSignerClient.getServiceAddress();
    const privKey = await btcSignerClient.getPrivKeyFromLegacyWallet(serviceAddress);
    const signedTx = await signPsbt(psbtb64, serviceAddress, privKey);
    const response = await btcBroadcastClient.submitSignedTx(signedTx)
    logger.info(`[signAndBroadcasting] Successfully broadcasted tx: ${response}`);
  } catch (e) {
    throw new Error(`Failed to broadcast: ${e}`);
  }
}