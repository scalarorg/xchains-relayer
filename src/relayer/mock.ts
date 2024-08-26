import { AxelarClient } from '../clients';

const BITCOIN_CHAIN_ID = 'Wbitcoin';
const MOCK_TX_HASH = '0x04936b1d1304e2d2b5cb841126b13507eeb36a3482fff9a6f16571062e00a3cd';

export async function mockSendConfirmTx(axelarClient: AxelarClient) {
    // Mock implementation
    const res = await axelarClient.confirmEvmTx(BITCOIN_CHAIN_ID, MOCK_TX_HASH);
    if (res) {
        console.log(`Confirmed: ${'0x' + res.transactionHash}`);
    } else {
        console.error(`Failed to confirm: ${MOCK_TX_HASH}`);
    }
    return;
}