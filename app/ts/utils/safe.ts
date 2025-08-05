import { encodePacked, zeroAddress } from 'viem'
import { mainnet } from 'viem/chains'
import { SAFE_ABI } from '../ABI/SafeAbi.js'
import { AccountAddress } from '../types/types.js'
import { ReadClient, WriteClient } from './ethereumWallet.js'

export const getOwners = async (readClient: ReadClient, safeAddress: `0x${string}`) => {
	return await readClient.readContract({
		abi: SAFE_ABI,
		functionName: 'getOwners',
		address: safeAddress,
		args: []
	})
}

export const execTransaction = async (writeClient: WriteClient, safeAddress: `0x${string}`, to: AccountAddress, data: `0x${string}`) => {
	const safeOwners = await getOwners(writeClient, safeAddress)
	if (safeOwners.length === 0) throw new Error(`Safe has no owners!`)
	// this signatrue is used when the transaction signer is one of the signers
	const signature = encodePacked(['uint256', 'uint256', 'bool'], [BigInt(writeClient.account.address), 0n, true])
	const value = 0n
	const operation = 0 // CALL
	const safeTxGas = 0n
	const baseGas = 0n
	const gasPrice = 0n
	const gasToken = zeroAddress
	const refundReceiver = zeroAddress

	return await writeClient.writeContract({
		chain: mainnet,
		abi: SAFE_ABI,
		functionName: 'execTransaction',
		address: safeAddress,
		args: [to, value, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver, signature]
	})
}
