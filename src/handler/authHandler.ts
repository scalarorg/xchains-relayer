import { BigNumber, ethers } from 'ethers';
import { DatabaseClient } from '../clients';
const OLD_KEY_RETENTION = 16;

export const validateProof = async (messageHash: string, proof: string): Promise<boolean> => {
  const dbClient = new DatabaseClient();
  const [operators, weights, threshold, signatures] = ethers.utils.defaultAbiCoder.decode(
    ['address[]', 'uint256[]', 'uint256', 'bytes[]'],
    proof
  );

  const operatorsHash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['address[]', 'uint256[]', 'uint256'],
      [operators, weights, threshold]
    )
  );
  const operatorsEpoch = (await dbClient.findOperatorshipEpoch(operatorsHash)) || 0;
  const epoch = await dbClient.getCurrentEpoch();
  console.log('Epoch', epoch, operatorsEpoch);
  if (operatorsEpoch === 0 || epoch - operatorsEpoch >= OLD_KEY_RETENTION) {
    throw new Error('InvalidOperators');
  }
  const weightsFormatted = weights.map((weight: BigNumber) => BigNumber.from(weight).toNumber());
  const thresholdFormatted = BigNumber.from(threshold).toNumber();
  _validateSignatures(messageHash, operators, weightsFormatted, thresholdFormatted, signatures);

  return operatorsEpoch === epoch;
};

export const _validateSignatures = (
  messageHash: string,
  operators: string[],
  weights: number[],
  threshold: number,
  signatures: string[]
) => {
  let operatorIndex = 0;
  let weight = 0;

  // Iterate over signatures
  for (let i = 0; i < signatures.length; i++) {
    const signer = ethers.utils.recoverAddress(messageHash, signatures[i]);
    // Find the operator that matches the recovered signer address
    while (operatorIndex < operators.length && signer !== operators[operatorIndex]) {
      operatorIndex++;
    }
    // If no matching operator is found, throw an error
    if (operatorIndex === operators.length) throw new Error('MalformedSigners');
    // Accumulate the weight of the valid signatures
    weight += weights[operatorIndex];
    // Check if accumulated weight meets or exceeds the threshold
    if (weight >= threshold) return;
    // Increment operator index if match is found
    operatorIndex++;
  }

  // If the total weight is below the threshold, throw an error
  throw new Error('LowSignaturesWeight');
};
