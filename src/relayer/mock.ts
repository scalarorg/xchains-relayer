import { AxelarClient, DatabaseClient } from '../clients';
// import { createBtcEventTransaction } from './rabbitmq';
import { BtcEventTransaction, BtcTransaction } from '../types/btc';
import { logger } from '../logger';
const MOCK_TX_HASH = '0x04936b1d1304e2d2b5cb841126b13507eeb36a3482fff9a6f16571062e00a3cd';

export async function mockHandleRabbitmqMsg(db: DatabaseClient, axelarClient: AxelarClient) {
    logger.info('Mocking handle message from RabbitMQ');

    const btcTransaction: BtcTransaction = {
        event_type: 0,
        staking_output_index: 0,
        vault_tx_hash_hex: "0x04936b1d1304e2d2b5cb841126b13507eeb36a3482fff9a6f16571062e00a3cd",
        vault_tx_hex: "020000000001017b901622f4df15389e991536546c39491a9770ea4df38196e7b7e75ad3c510200300000000fdffffff0410270000000000002251207f99d0801267696850236ed8a63bd386e151e4f5704c64ab070aa5e87299be910000000000000000476a4501020304002b122fd36a9db2698c39fb47df3e3fa615e70e368acb874ec5494e4236722b2d61e1436122e3973468bd8776b8ca0645e37a5760c4a2be7796acb94cf312ce0d00000000000000003a6a380000000000aa36a7130c4810d57140e1e62967cbf742caeae91b6ece768e8de8cf0c7747d41f75f83c914a19c5921cf30000000000002710e1cf08000000000016001408b7b00b0f720cf5cc3e7e38aaae1a572b962b24024830450221009af220719aad8d9bcd75a234d3619a4fe6193b56b59a39ee072ddf3c65cbb22c02207f278d5a12c2fd675574d2b59b571da6e3628b94b0254a106e96a41c33c75e080121032b122fd36a9db2698c39fb47df3e3fa615e70e368acb874ec5494e4236722b2d00000000",
        finality_provider_pk_hex: "",
        staking_value: 10000,
        staking_start_height: 2500000,
        staking_start_timestamp: 1630000000,
        chain_id: "bitcoin",
        chain_id_user_address: "130C4810D57140e1E62967cBF742CaEaE91b6ecE",              // base64 Encode User address on the destination chain for receiving the minted tokens
        chain_id_smart_contract_address: "768E8De8cf0c7747D41f75F83C914a19C5921Cf3",     // Smnart contract address on the destination chain for handling minting logic
        amount_minting: "10000",
        staker_pk_hex: "02b122fd",
        
        is_overflow: false
    }
    const btcEvent: BtcEventTransaction = {
        txHash: "0x04936b1d1304e2d2b5cb841126b13507eeb36a3482fff9a6f16571062e00a3cd",
        logIndex: 0,
        blockNumber: 2500000,
        mintingAmount: "10000",
        sender: "0x130C4810D57140e1E62967cBF742CaEaE91b6ecE",
        sourceChain: "bitcoin",
        destinationChain: "ethereum-sepolia",
        destinationContractAddress: "0x768E8De8cf0c7747D41f75F83C914a19C5921Cf3",
        //mintingAmount: string;
        payload: "10000",
        payloadHash: "",
        args: btcTransaction,
        stakerPublicKey: "02b122fd",
        vaultTxHex:"020000000001017b901622f4df15389e991536546c39491a9770ea4df38196e7b7e75ad3c510200300000000fdffffff0410270000000000002251207f99d0801267696850236ed8a63bd386e151e4f5704c64ab070aa5e87299be910000000000000000476a4501020304002b122fd36a9db2698c39fb47df3e3fa615e70e368acb874ec5494e4236722b2d61e1436122e3973468bd8776b8ca0645e37a5760c4a2be7796acb94cf312ce0d00000000000000003a6a380000000000aa36a7130c4810d57140e1e62967cbf742caeae91b6ece768e8de8cf0c7747d41f75f83c914a19c5921cf30000000000002710e1cf08000000000016001408b7b00b0f720cf5cc3e7e38aaae1a572b962b24024830450221009af220719aad8d9bcd75a234d3619a4fe6193b56b59a39ee072ddf3c65cbb22c02207f278d5a12c2fd675574d2b59b571da6e3628b94b0254a106e96a41c33c75e080121032b122fd36a9db2698c39fb47df3e3fa615e70e368acb874ec5494e4236722b2d00000000"
    };

    logger.info('Create btcEventTransaction')
    try {
        // const btcEvent: BtcEventTransaction = createBtcEventTransaction(btcTransaction);
        // 1. Connect to the database
        await db.connect();
        // 2. Create the event in the database
        logger.info('Create btcCallContractEvent');
        await db.createBtcCallContractEvent(btcEvent);
    } catch (e) {
        logger.error('Failed to create btc event in the database:', e);
    }
    // 3. Wait for the event to be finalized - get enough confirmations
    // await ev.waitForFinality();
    // 4. Handle the event by sending the confirm tx to the axelar network
    
    // Mock implementation
    logger.info('Send transaction to the Core network for confirmation');
    const res = await axelarClient.confirmEvmTx(btcTransaction.chain_id, btcTransaction.vault_tx_hash_hex);
    if (res) {
        console.log(`Confirmed: ${'0x' + res.transactionHash}`);
    } else {
        console.error(`Failed to confirm: ${MOCK_TX_HASH}`);
    }
    return;
}