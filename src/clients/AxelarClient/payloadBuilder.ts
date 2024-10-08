import {
  ConfirmGatewayTxRequest as EvmConfirmGatewayTxRequest,
  protobufPackage as EvmProtobufPackage,
  SignCommandsRequest as EvmSignCommandsRequest,
} from '@axelar-network/axelarjs-types/axelar/evm/v1beta1/tx';
import {
  RouteMessageRequest as ExecuteMessageRequest,
  CallContractRequest,
  protobufPackage as AxelarProtobufPackage
} from '@axelar-network/axelarjs-types/axelar/axelarnet/v1beta1/tx';
import { toAccAddress } from '@cosmjs/stargate/build/queryclient/utils';
import { fromHex } from '@cosmjs/encoding';
import { utils } from 'ethers';

/**
 * Get payload for confirm gateway tx on evm chain
 * @param sender - sender address
 * @param chain - chain name
 * @param txHash - source tx hash
 * @returns
 */
export function getConfirmGatewayTxPayload(sender: string, chain: string, txHash: string) {
  return [
    {
      typeUrl: `/${EvmProtobufPackage}.ConfirmGatewayTxRequest`,
      value: EvmConfirmGatewayTxRequest.fromPartial({
        sender: toAccAddress(sender),
        chain,
        txId: utils.arrayify(txHash),
      }),
    },
  ];
}

export function getCallContractRequest(sender: string, chain: string, contractAddress: string, payload: string) {
  return [
    {
      typeUrl: `/${AxelarProtobufPackage}.CallContractRequest`,
      value: CallContractRequest.fromPartial({
        sender: toAccAddress(sender),
        chain,
        contractAddress,
        payload: utils.arrayify(payload),
      }),
    },
  ];
}

export function getRouteMessageRequest(
  sender: string,
  txHash: string,
  logIndex: number,
  payload: string
) {
  return [
    {
      typeUrl: `/${AxelarProtobufPackage}.RouteMessageRequest`,
      value: ExecuteMessageRequest.fromPartial({
        sender: toAccAddress(sender),
        payload: fromHex(payload.slice(2)),
        id: logIndex === -1 ? `${txHash}` : `${txHash}-${logIndex}`,
      }),
    },
  ];
}

export function getSignCommandPayload(sender: string, chain: string) {
  return [
    {
      typeUrl: `/${EvmProtobufPackage}.SignCommandsRequest`,
      value: EvmSignCommandsRequest.fromPartial({
        sender: toAccAddress(sender),
        chain,
      }),
    },
  ];
}
