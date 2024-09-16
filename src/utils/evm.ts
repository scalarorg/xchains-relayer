import { ethers } from 'ethers';

export function decodeGatewayExecuteData(executeData: string) {
    //const iface = new ethers.utils.Interface(IAxelarExecutable__factory.abi);
    const executeABI = [
        "function execute(bytes calldata input) external override",
    ];
    const executeInterface = new ethers.utils.Interface(executeABI);
    const { input } = executeInterface.decodeFunctionData(
        "execute",
        executeData
    );
    const [data, proof] = ethers.utils.defaultAbiCoder.decode(
        ["bytes", "bytes"],
        input
    );
    //Data part
    const [chainId, commandIds, commands, params] = ethers.utils.defaultAbiCoder.decode(
        ["uint256", "bytes32[]", "string[]", "bytes[]"],
        data
    );
    //Proof part
    const [operators, weights, threshold, signatures] = ethers.utils.defaultAbiCoder.decode(
        ["address[]", "uint256[]", "uint256", "bytes[]"],
        proof
    );
    return {
        data: { chainId, commandIds, commands, params },
        proof: {operators, weights, threshold, signatures}
    }
}
