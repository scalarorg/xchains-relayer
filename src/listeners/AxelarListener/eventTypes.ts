import { DatabaseClient } from '../../clients';
import {
  ContractCallSubmitted,
  ContractCallWithTokenSubmitted,
  ExecuteRequest,
  IBCEvent,
  IBCPacketEvent,
} from '../../types';
import { Parser } from './parser';

export interface AxelarListenerEvent<T> {
  type: string;
  topicId: string;
  parseEvent: (event: any) => Promise<T>;
}

const parser = new Parser(new DatabaseClient());

const AxelarEVMCompletedEventTopicId = `tm.event='NewBlock' AND axelar.evm.v1beta1.EVMEventCompleted.event_id EXISTS`;
const AxelarCosmosContractCallEventTopicId = `tm.event='Tx' AND axelar.axelarnet.v1beta1.ContractCallSubmitted.message_id EXISTS`
const AxelarCosmosContractCallApprovedEventTopicId = `tm.event='NewBlock' AND axelar.evm.v1beta1.ContractCallApproved.event_id EXISTS`
const AxelarCosmosContractCallWithTokenEventTopicId = `tm.event='Tx' AND axelar.axelarnet.v1beta1.ContractCallWithTokenSubmitted.message_id EXISTS`;
const AxelarIBCCompleteEventTopicId = `tm.event='Tx' AND message.action='ExecuteMessage'`;

// const AxelarEVMCompletedEventTopicId = `axelar.evm.v1beta1.EVMEventCompleted.event_id EXISTS`;
// const AxelarCosmosContractCallWithTokenEventTopicId = `axelar.axelarnet.v1beta1.ContractCallWithTokenSubmitted.message_id EXISTS`;
// const AxelarIBCCompleteEventTopicId = `message.action='ExecuteMessage'`;


export const AxelarEVMCompletedEvent: AxelarListenerEvent<ExecuteRequest> = {
  type: 'axelar.evm.v1beta1.EVMEventCompleted',
  topicId: AxelarEVMCompletedEventTopicId,
  parseEvent: parser.parseEvmEventCompletedEvent,
};

export const AxelarCosmosContractCallEvent: AxelarListenerEvent<
  IBCEvent<ContractCallSubmitted>
> = {
  type: 'axelar.axelarnet.v1beta1.ContractCallSubmitted',
  topicId: AxelarCosmosContractCallEventTopicId,
  parseEvent: parser.parseContractCallSubmittedEvent,
};

export const AxelarCosmosContractCallApprovedEvent: AxelarListenerEvent<
  IBCEvent<ContractCallSubmitted>
> = {
  type: 'axelar.evm.v1beta1.ContractCallApproved',
  topicId: AxelarCosmosContractCallApprovedEventTopicId,
  parseEvent: parser.parseContractCallApprovedEvent,
};

export const AxelarCosmosContractCallWithTokenEvent: AxelarListenerEvent<
  IBCEvent<ContractCallWithTokenSubmitted>
> = {
  type: 'axelar.axelarnet.v1beta1.ContractCallWithTokenSubmitted',
  topicId: AxelarCosmosContractCallWithTokenEventTopicId,
  parseEvent: parser.parseContractCallWithTokenSubmittedEvent,
};

export const AxelarIBCCompleteEvent: AxelarListenerEvent<IBCPacketEvent> = {
  type: 'ExecuteMessage',
  topicId: AxelarIBCCompleteEventTopicId,
  parseEvent: parser.parseIBCCompleteEvent,
};
