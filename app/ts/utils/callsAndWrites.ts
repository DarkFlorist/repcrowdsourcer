import { ERC20_ABI } from '../ABI/Erc20Abi.js'
import { AccountAddress } from '../types/types.js'
import { GoFundMicah } from '../VendoredRepCrowdsourcer.js'
import { getRepCrowdSourcerAddress } from './deployment.js'
import { ReadClient, WriteClient } from './ethereumWallet.js'
import { encodeFunctionData } from 'viem'
import { execTransaction, getOwners } from './safe.js'

export const repV2TokenAddress = '0x221657776846890989a759BA2973e427DfF5C9bB'

export const getSafeAddress = () => {
	return '0xed1e06B49C53293A1321Dd47Abf8D50F9Be77E11' as const
	// return await client.readContract({
	// 	abi: GoFundMicah.abi,
	// 	functionName: 'micahAddress',
	// 	address: getRepCrowdSourcerAddress(),
	// 	args: [],
	// })
}

export const getSafeOwnerAddresses = async (client: ReadClient) => {
	return await getOwners(client, getSafeAddress())
}

export const getMinBalanceToWithdraw = async (client: ReadClient) => {
	return await client.readContract({
		abi: GoFundMicah.abi,
		functionName: 'minBalanceToWithdraw',
		address: getRepCrowdSourcerAddress(),
		args: []
	})
}

export const getTotalBalance = async (client: ReadClient) => {
	return await client.readContract({
		abi: ERC20_ABI,
		functionName: 'balanceOf',
		address: repV2TokenAddress,
		args: [getRepCrowdSourcerAddress()]
	})
}

export const getBalance = async (client: ReadClient, address: AccountAddress) => {
	return await client.readContract({
		abi: GoFundMicah.abi,
		functionName: 'balanceOf',
		address: getRepCrowdSourcerAddress(),
		args: [address]
	})
}

export const getDepositsEnabled = async (client: ReadClient) => {
	return await client.readContract({
		abi: GoFundMicah.abi,
		functionName: 'depositsEnabled',
		address: getRepCrowdSourcerAddress(),
		args: []
	})
}

export const deposit = async (client: WriteClient, amount: bigint) => {
	return await client.writeContract({
		abi: GoFundMicah.abi,
		functionName: 'deposit',
		address: getRepCrowdSourcerAddress(),
		args: [amount]
	})
}

export const withdraw = async (client: WriteClient) => {
	return await client.writeContract({
		abi: GoFundMicah.abi,
		functionName: 'withdraw',
		address: getRepCrowdSourcerAddress(),
		args: []
	})
}

export const massWithdraw = async (client: WriteClient, addresses: AccountAddress[]) => {
	return await client.writeContract({
		abi: GoFundMicah.abi,
		functionName: 'massWithdraw',
		address: getRepCrowdSourcerAddress(),
		args: [addresses]
	})
}

export const micahCloseContract = async (client: WriteClient) => {
	const encoded = encodeFunctionData({
		abi: GoFundMicah.abi,
		functionName: 'micahCloseContract',
		args: []
	})
	return await execTransaction(client, getSafeAddress(), getRepCrowdSourcerAddress(), encoded)
}

export const micahWithdraw = async (client: WriteClient) => {
	const encoded = encodeFunctionData({
		abi: GoFundMicah.abi,
		functionName: 'micahWithdraw',
		args: []
	})
	return await execTransaction(client, getSafeAddress(), getRepCrowdSourcerAddress(), encoded)
}

export const micahSetWithdrawsEnabled = async (client: WriteClient) => {
	const encoded = encodeFunctionData({
		abi: GoFundMicah.abi,
		functionName: 'setWithdrawsEnabled',
		args: []
	})
	return await execTransaction(client, getSafeAddress(), getRepCrowdSourcerAddress(), encoded)
}

export const getWithdrawsEnabled = async (client: ReadClient) => {
	return await client.readContract({
		abi: GoFundMicah.abi,
		functionName: 'withdrawsEnabled',
		address: getRepCrowdSourcerAddress(),
		args: []
	})
}
