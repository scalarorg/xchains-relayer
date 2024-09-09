import { btcChains } from '../src/config';
import { BtcClient } from '../src/clients';
import { signPsbt } from '../src/utils/btc-utils';
const chai = require('chai');
const expect = chai.expect;

module.exports = async () => {
  describe('btcclient', () => {
    it('should return error: Transaction already in block chain', async () => {
      const btcClients = btcChains.map((btc) => new BtcClient(btc));
      let btcBroadcastClient, btcSignerClient;
      for (const btcClient of btcClients) {
        if (btcClient.config.chainId.toLowerCase() === 'bitcoin') {
          if (btcClient.isSigner()) {
            btcSignerClient = btcClient;
          } else if (btcClient.isBroadcast()) {
            btcBroadcastClient = btcClient;
          }
        }
      }
      const tx =
        'cHNidP8BAFICAAAAAaFApJeWTrp6Z24MlqVYMIxzkrksleRoSFdFeDBDFMVlAAAAAAD9////AUQCAAAAAAAAFgAUCLewCw9yDPXMPn44qq4aVyuWKyQAAAAAAAEBKxAnAAAAAAAAIlEgf5nQgBJnaWhQI27YpjvThuFR5PVwTGSrBwql6HKZvpFBFCsSL9NqnbJpjDn7R98+P6YV5w42isuHTsVJTkI2cistsmgk5avxC/upqj+SOfrasnz9opWSulsuVGa6NC6x1HJAldeim4+k+j4foeIncVn9dXBdnMcj6MTx7I7cBJDYY906PFMrH0s90SzmxHSmTO3hATV0eZLT4ZRVgUboajPThGIVwVCSm3TBoElUt4tLYDXpel4HiloPKOyW1Ue/7prOgDrAJjocoAClGPYQL8EmeteeH4+y9PeVHaPi8ZimUMLYh+9qFcRUo4k/U2y/P0xvyvaJ3fgAtbN6RpUORsx5cnpn00UgKxIv02qdsmmMOftH3z4/phXnDjaKy4dOxUlOQjZyKy2tIGHhQ2Ei45c0aL2HdrjKBkXjeldgxKK+d5asuUzzEs4NrMAAAA==';
      const serviceAddress = await btcSignerClient?.getServiceAddress();
      const privKey = await btcSignerClient?.getPrivKeyFromLegacyWallet(serviceAddress!);
      const signedTx = await signPsbt(tx, serviceAddress!, privKey);
      try {
        await btcBroadcastClient?.submitSignedTx(signedTx);
        throw new Error('Expected promise to be rejected.');
      } catch (error) {
        expect(String(error)).to.include('Transaction already in block chain');
      }
    });
  });
};
