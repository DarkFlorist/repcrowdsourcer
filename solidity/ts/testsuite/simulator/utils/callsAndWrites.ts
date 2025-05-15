import { ERC20_ABI } from '../../../abi/Erc20Abi.js'
import { GoFundMicah } from '../../../abi/VendoredRepCrowdsourcer.js'
import { EthereumQuantity } from '../types/wire-types.js'
import { getRepCrowdSourcerAddress } from './deployment.js'
import { ReadClient, WriteClient } from './ethereumWallet.js'
import { AccountAddress } from './viem.js'

export const repV2TokenAddress = '0x221657776846890989a759BA2973e427DfF5C9bB'

export const getMicahAddress = async (client: ReadClient) => {
	return await client.readContract({
		abi: GoFundMicah.abi,
		functionName: 'micahAddress',
		address: getRepCrowdSourcerAddress(),
		args: []
	})
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
		functionName: 'deposits',
		address: getRepCrowdSourcerAddress(),
		args: [address]
	})
}

export const getContractClosed = async (client: ReadClient) => {
	return await client.readContract({
		abi: GoFundMicah.abi,
		functionName: 'contractClosed',
		address: getRepCrowdSourcerAddress(),
		args: []
	})
}

export const deposit = async (client: WriteClient, amount: EthereumQuantity) => {
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
	return await client.writeContract({
		abi: GoFundMicah.abi,
		functionName: 'micahCloseContract',
		address: getRepCrowdSourcerAddress(),
		args: []
	})
}

export const micahWithdraw = async (client: WriteClient) => {
	return await client.writeContract({
		abi: GoFundMicah.abi,
		functionName: 'micahWithdraw',
		address: getRepCrowdSourcerAddress(),
		args: []
	})
}
