// import { signPsbt } from '../src/utils/btc-utils';
// // import { Staker, UnStaker } from '../remotebtclib/lib/vault';
// import * as bitcoin from 'bitcoinjs-lib';
// import { ECPairFactory, ECPairAPI, TinySecp256k1Interface } from 'ecpair';
// import { getUTXOs } from './utils/api';
// const tinysecp: TinySecp256k1Interface = require('tiny-secp256k1');

// const ECPair: ECPairAPI = ECPairFactory(tinysecp);

// const chai = require('chai');
// const expect = chai.expect;

// import dotenv from 'dotenv';
// import { func } from 'joi';
// dotenv.config({ path: '../.env.example' });

// module.exports = async () => {
//   describe('signTx', () => {
//     console.log('Start test');
//     it('should sign successfully and return a signed transaction', async function () {
//       this.timeout(10000); // Increase the timeout to 10 seconds
//       const { b64SignedStakerBurningPsbt, protocol_keyPair } = await prepareData();
//       const psbt = b64SignedStakerBurningPsbt;
//       const privProtocol = protocol_keyPair.toWIF();
//       const serviceAddress = bitcoin.payments.p2wpkh({
//         pubkey: protocol_keyPair.publicKey,
//         network: bitcoin.networks.testnet,
//       }).address;
//       // expect not to throw an error and return a valid signed transaction
//       try {
//         const signedTx = await signPsbt(psbt, serviceAddress!, privProtocol);
//         // make sure from hex
//         bitcoin.Transaction.fromHex(signedTx);
//         // make sure it is a string
//         expect(signedTx).to.be.a('string');
//       } catch (e) {
//         expect.fail(e);
//       }
//     });
//   });
// };

// async function prepareData() {
//   // prepare data
//   // global data from global-params.json:
//   const version = 0;
//   const tag = '01020304';
//   const qorum = 3;
//   const covenant_pks = [
//     '02a60c2b5524ee762c3e56ea23a992953b88226463abcd1ca819d1d64880393791',
//     '02f8812f5b3456f55b24d1e038a3900eae89a46d2394825b55145c24bb41c5be6d',
//     '0330c74896d8724ef941d9fb129ea2a36b2e4eb87d37299ebd2f0f61be5a8d88cf',
//     '03b029725f0b73a63cbf43cb7219178af098cd28f49398be587c75c34d5ae60fa8',
//     '03fa7eb611fd1466820d97fc682a35e0f3af5db8e1a35acf653fa2e2f482f1cc52',
//   ];

//   // to ETH data
//   const chainID = 'aa36a7';
//   const chainIdUserAddress = '130C4810D57140e1E62967cBF742CaEaE91b6ecE';
//   const chainSmartContractAddress = '768E8De8cf0c7747D41f75F83C914a19C5921Cf3';
//   const mintingAmount = 10000; // in satoshis

//   // random staker
//   const staker_keyPair = ECPair.fromWIF(process.env.stakerWIF!, bitcoin.networks.testnet);
//   const protocol_keyPair = ECPair.makeRandom({ network: bitcoin.networks.testnet });

//   const address = 'tb1qpzmmqzc0wgx0tnp70cu24ts62u4ev2ey8xlgn3'; // fixed your address
//   const staker = new Staker(
//     address!,
//     staker_keyPair.publicKey.toString('hex'),
//     protocol_keyPair.publicKey.toString('hex'),
//     covenant_pks,
//     qorum,
//     tag,
//     version,
//     chainID,
//     chainIdUserAddress,
//     chainSmartContractAddress,
//     mintingAmount
//   );
//   const regularUTXOs = await getUTXOs(address); // Mempool call api
//   const stakingAmount = 10000; // in statoshis
//   const feeRate = 1;
//   const rbf = true;
//   const { psbt: unsignedVaultPsbt, feeEstimate: fee } = await staker.getUnsignedVaultPsbt(
//     regularUTXOs,
//     stakingAmount,
//     feeRate,
//     rbf
//   );
//   unsignedVaultPsbt.signAllInputs(staker_keyPair);
//   unsignedVaultPsbt.finalizeAllInputs();
//   const signedVaultTx = unsignedVaultPsbt.extractTransaction();
//   const unstaker = new UnStaker(address, signedVaultTx.toHex(), covenant_pks, qorum);
//   const receiveAddress = 'tb1qpzmmqzc0wgx0tnp70cu24ts62u4ev2ey8xlgn3';
//   const { psbt: burningPsbt } = await unstaker.getUnsignedBurningPsbt(receiveAddress, feeRate, rbf);
//   burningPsbt.signInput(0, staker_keyPair);
//   const b64SignedStakerBurningPsbt = burningPsbt.toBase64();
//   return { b64SignedStakerBurningPsbt, protocol_keyPair };
// }
