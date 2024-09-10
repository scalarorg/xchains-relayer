import { filter, of, throwError } from 'rxjs';
import { EvmEvent } from '../types';
import {
  ContractCallApprovedEventObject,
  ContractCallApprovedWithMintEventObject,
  ContractCallEventObject,
  ContractCallWithTokenEventObject,
} from '../types/contracts/IAxelarGateway';
import { CosmosNetworkConfig } from '../config/types';
import { EvmClient } from '../clients';
import { env } from '../config';

export function filterCosmosDestination(cosmosChains: CosmosNetworkConfig[]) {
  //Todo: TaiVV 20240829: Accept all destination chains not only cosmos chains
  if (env.CHAIN_ENV === 'devnet' || env.CHAIN_ENV === 'testnet')
    return filter<EvmEvent<ContractCallWithTokenEventObject | ContractCallEventObject>>(() => true);

  return filter((event: EvmEvent<ContractCallWithTokenEventObject | ContractCallEventObject>) =>
    cosmosChains.map((chain) => chain.chainId).includes(event.args.destinationChain)
  );
}

export function mapEventToEvmClient(
  event: EvmEvent<ContractCallApprovedEventObject | ContractCallApprovedWithMintEventObject>,
  evmClients: EvmClient[]
) {
  // Find the evm client associated with event's destination chain
  const evmClient = evmClients.find(
    (client) => client.chainId.toLowerCase() === event.destinationChain.toLowerCase()
  );

  // If no evm client found, return
  if (!evmClient)
    return throwError(
      () => `No evm client found for event's destination chain ${event.destinationChain}`
    );

  return of({
    evmClient,
    event,
  });
}

export function mapChainNameToEvmClient(
  chainName: string,
  evmClients: EvmClient[]
) {
  // Find the evm client associated with event's destination chain
  const evmClient = evmClients.find(
    (client) => client.chainId.toLowerCase() === chainName.toLowerCase()
  );

  // If no evm client found, return
  if (!evmClient)
    return throwError(
      () => `No evm client found for event's destination chain ${chainName}`
    );

  return evmClient;
}