import { MongoInstance } from 'mongo/db';

export async function processBurningTxs(
  psbtb64: string,
  sourceChain: string,
  sourceTxHash: string
) {
  // await validateBurningTxs(btcBroadcastClient, psbtb64);
  // return await signAndBroadcasting(btcSignerClient, btcBroadcastClient, psbtb64);
  return await submitPsbt(psbtb64, sourceChain, sourceTxHash);
}

// TODO: parsing and verify burning txs
// async function validateBurningTxs(btcBroadcastClient: BtcClient, psbtb64: string): Promise<void> {
//   try {
//     // await parseTx(psbtb64);
//     // await verifyTx(client, psbtb64);
//   } catch (e) {
//     throw new Error(`Failed to validate tx: ${e}`);
//   }
// }

// async function signAndBroadcasting(
//   btcSignerClient: BtcClient,
//   btcBroadcastClient: BtcClient,
//   psbtb64: string
// ) {
//   try {
//     const serviceAddress = await btcSignerClient.getServiceAddress();
//     // TODO: move this part to signing service

//     // const privKey = await btcSignerClient.getPrivKeyFromLegacyWallet(serviceAddress);
//     const privKey = btcSignerClient.getPrivateKeyFromConfig();
//     console.log('[signAndBroadcasting] privKey: ', privKey);

//     const signedTx = await signPsbt(psbtb64, serviceAddress, privKey);
//     const response = await btcBroadcastClient.submitSignedTx(signedTx);
//     console.log(`[signAndBroadcasting] Successfully broadcasted tx: ${response}`);
//     return response;
//   } catch (e) {
//     throw new Error(`Failed to broadcast: ${e}`);
//   }
// }

async function submitPsbt(psbtb64: string, sourceChain: string, sourceTxHash: string) {
  try {
    const result = await MongoInstance.db('xchains-api').collection('dapps').findOne(
      { chain_name: sourceChain }
      // {
      //   projection: { rpc_url: 1 }, // TODO: check projection
      // }
    );

    if (!result) {
      throw new Error('Chain not found');
    }

    const rpcUrl = result.rpc_url;
    const accessToken = result.access_token;

    if (!rpcUrl) {
      throw new Error('RPC URL not found');
    }

    if (!accessToken) {
      throw new Error('Access token not found');
    }

    return fetch(`${rpcUrl}/v1/sign-unbonding-tx`, {
      method: 'POST',
      body: JSON.stringify({
        evm_chain_name: sourceChain,
        evm_tx_id: sourceTxHash,
        unbonding_psbt: psbtb64,
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('Submit PSBT data: ', data);
        return data.tx_id as string;
      })
      .catch((e) => {
        throw new Error(`Failed to submit psbt: ${e}`);
      });
    // TODO: FIX THIS
  } catch (e) {
    throw new Error(`Failed to submit psbt: ${e}`);
  }
}
