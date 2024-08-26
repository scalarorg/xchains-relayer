import axios from "axios"
import mempoolJS from "@mempool/mempool.js";

export async function getUTXOs(address: string) {
  
  const { bitcoin: { addresses } } = mempoolJS({
    hostname: 'mempool.space',
    network: 'testnet'
  });
  const addressTxsUtxo = await addresses.getAddressTxsUtxo({ address });
  return addressTxsUtxo;
};
