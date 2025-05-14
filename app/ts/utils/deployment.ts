import { getContractAddress, numberToBytes } from 'viem'
import { ReadClient, WriteClient } from './ethereumWallet.js'
import { REP_CROWDSOURCER_DEPLOYED_BYTECODE, REP_CROWDSOURCER_DEPLOYMENT_BYTECODE } from './bytecode.js'

const PROXY_DEPLOYER_ADDRESS = '0x7a0d94f55792c434d74a40883c6ed8545e406d12'

export function getRepCrowdSourcerAddress() {
	const bytecode: `0x${ string }` = `0x${ REP_CROWDSOURCER_DEPLOYMENT_BYTECODE }`
	return getContractAddress({ bytecode, from: PROXY_DEPLOYER_ADDRESS, opcode: 'CREATE2', salt: numberToBytes(0n) })
}

export const deployRepCrowdSourcerTransaction = () => {
	const bytecode: `0x${ string }` = `0x${ REP_CROWDSOURCER_DEPLOYMENT_BYTECODE }`
	return { to: PROXY_DEPLOYER_ADDRESS, data: bytecode } as const
}

export const deployRepCrowdSourcer = async (client: WriteClient) => {
	const hash = await client.sendTransaction(deployRepCrowdSourcerTransaction())
	await client.waitForTransactionReceipt({ hash })
}

export const isRepCrowdSourcerDeployed = async (client: ReadClient) => {
	const expectedDeployedBytecode: `0x${ string }` = `0x${ REP_CROWDSOURCER_DEPLOYED_BYTECODE }`
	const address = getRepCrowdSourcerAddress()
	const deployedBytecode = await client.getCode({ address })
	return deployedBytecode === expectedDeployedBytecode
}
