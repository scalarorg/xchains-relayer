import { exec } from 'child_process';
const ethers = require('ethers');
import { DatabaseClient } from './clients';

interface Participant {
  pub_key: string;
  weight: number;
}
interface Operator {
  address: string;
  weight: number;
}

export async function transferOperatorship(dbClient: DatabaseClient): Promise<void> {
  const [newOperators, newWeights, newThreshold] = await readOperatorsInfo();

  if (newOperators.length === 0) {
    console.error('No operators found');
    return;
  }

  // Extracting addresses and powers
  let combinedArray: Operator[] = newOperators.map((address: string, index: number) => {
    return {
      address: address,
      weight: newWeights[index],
    };
  });
  combinedArray.sort((a: Operator, b: Operator) => {
    if (a.address.toLowerCase() < b.address.toLowerCase()) return -1;
    if (a.address.toLowerCase() > b.address.toLowerCase()) return 1;
    return 0;
  });
  const sortedOperators = combinedArray.map((item) => item.address);
  const sortedWeights = combinedArray.map((item) => item.weight);
  const types = ['address[]', 'uint256[]', 'uint256'];
  const encodedParams = ethers.utils.defaultAbiCoder.encode(types, [
    sortedOperators,
    sortedWeights,
    newThreshold,
  ]);
  await dbClient.createOperatorEpoch(encodedParams);
}

async function readOperatorsInfo(): Promise<[string[], number[], number]> {
  const keyId = 'bitcoin';
  const node = 'tcp://scalarnode1:26657';
  try {
    const output = await runAxelardCommand(keyId, node);
    const jsonData = JSON.parse(output);

    // Extract the validators data
    const threshold: number = jsonData.threshold_weight;
    const operators: string[] = jsonData.participants.map((participant: Participant) => {
      const pubKey = '0x' + participant.pub_key;
      return ethers.utils.computeAddress(pubKey);
    });
    const weights = jsonData.participants.map((participant: Participant) => {
      return participant.weight;
    });
    return [operators, weights, threshold];
  } catch (err) {
    console.error('Error executing command:', err);
    return [[], [], 0];
  }
}

function runAxelardCommand(keyId: string, node: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const dockerCommand = `axelard q multisig key ${keyId} --node ${node} -o json`;
    exec(dockerCommand, (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${stderr}`);
      } else {
        resolve(stdout);
      }
    });
  });
}