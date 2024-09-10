import { createBtcEventTransaction } from '../src/relayer/rabbitmq';
import { BtcEventTransaction, BtcTransaction } from '../src/types';
import chai from 'chai';

const expect = chai.expect;

module.exports = () => {
  describe('createBtcEventTransaction', () => {
    it('should create a BtcEventTransaction object from a BtcTransaction object', () => {
      const btcTransaction: BtcTransaction = {
        vault_tx_hash_hex: '2eae89bb0fdfae57970102ba94e7751cbb28d04029cc203509d99a180b8ae1ef',
        vault_tx_hex:
          '02000000000101c22f396298cf6a7b61a22506ca1baa91b1ec1c979c7a84afda20125a33a07e230300000000fdffffff0410270000000000002251207f99d0801267696850236ed8a63bd386e151e4f5704c64ab070aa5e87299be910000000000000000476a4501020304002b122fd36a9db2698c39fb47df3e3fa615e70e368acb874ec5494e4236722b2d61e1436122e3973468bd8776b8ca0645e37a5760c4a2be7796acb94cf312ce0d00000000000000003a6a3800000000000000016bb9f03858c8ed34cb6ceb2bb26b17da80bc512cb5065df90c390a7c5318f822b0fa96cde2f3305100000000000003e83f0c02000000000016001408b7b00b0f720cf5cc3e7e38aaae1a572b962b2402483045022100acc1f49ef980389e70d742a7fe9f27ed8852fd6c3cade50a7c76a4ee64dcd4e3022079f9a2123f766cd7bb0fa15970978dc944756f5fe137d673f128961e458b016b0121032b122fd36a9db2698c39fb47df3e3fa615e70e368acb874ec5494e4236722b2d00000000',
        finality_provider_pk_hex:
          '61e1436122e3973468bd8776b8ca0645e37a5760c4a2be7796acb94cf312ce0d',
        staking_value: 10000,
        staking_start_height: 1234,
        staking_start_timestamp: 1234,
        chain_id: 'AAAAAACqNqc=',
        chain_id_user_address: 'EwxIENVxQOHmKWfL90LK6ukbbs4=',
        chain_id_smart_contract_address: 'do6N6M8Md0fUH3X4PJFKGcWSHPM=',
        amount_minting: 'AAAAAAAAJxA=',
        is_overflow: false,
      };

      const expectedBtcEventTransaction: BtcEventTransaction = {
        txHash: '0x2eae89bb0fdfae57970102ba94e7751cbb28d04029cc203509d99a180b8ae1ef',
        logIndex: 0,
        blockNumber: 0,
        mintingAmount: "10000",
        sender: '0x130c4810d57140e1e62967cbf742caeae91b6ece',
        sourceChain: 'bitcoin',
        destinationChain: 'ethereum-sepolia',
        destinationContractAddress: '0x768e8de8cf0c7747d41f75f83c914a19c5921cf3',
        payload:
          '0x000000000000000000000000130c4810d57140e1e62967cbf742caeae91b6ece0000000000000000000000000000000000000000000000000000000000002710',
        payloadHash: '0x697d52f010038ab37352d5109e7d1120fc7b7fcf7ccba5d29d2c8122b5c258d8',
        args: btcTransaction,
      };

      const result = createBtcEventTransaction("bitcoin", btcTransaction);

      expect(result).to.deep.equal(expectedBtcEventTransaction);
    });
  });
};
