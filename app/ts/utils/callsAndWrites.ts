import { ERC20_ABI } from '../ABI/Erc20Abi.js'
import { REP_CROWDSOURCER_ABI } from '../ABI/RepCrowdSourcerAbi.js'
import { AccountAddress, EthereumQuantity } from '../types/types.js'
import { getRepCrowdSourcerAddress } from './deployment.js'
import { ReadClient, WriteClient } from './ethereumWallet.js'

export const repV2TokenAddress = '0x221657776846890989a759BA2973e427DfF5C9bB'

export const getMicahAddress = async (client: ReadClient) => {
	return await client.readContract({
		abi: REP_CROWDSOURCER_ABI,
		functionName: 'micahAddress',
		address: getRepCrowdSourcerAddress(),
		args: []
	})
}

export const getMinBalanceToWithdraw = async (client: ReadClient) => {
	return await client.readContract({
		abi: REP_CROWDSOURCER_ABI,
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
		abi: REP_CROWDSOURCER_ABI,
		functionName: 'deposits',
		address: getRepCrowdSourcerAddress(),
		args: [address]
	})
}

export const getContractClosed = async (client: ReadClient) => {
	return await client.readContract({
		abi: REP_CROWDSOURCER_ABI,
		functionName: 'contractClosed',
		address: getRepCrowdSourcerAddress(),
		args: []
	})
}

export const deposit = async (client: WriteClient, amount: EthereumQuantity) => {
	return await client.writeContract({
		abi: REP_CROWDSOURCER_ABI,
		functionName: 'deposit',
		address: getRepCrowdSourcerAddress(),
		args: [amount]
	})
}

export const withdraw = async (client: WriteClient, amount: EthereumQuantity) => {
	return await client.writeContract({
		abi: REP_CROWDSOURCER_ABI,
		functionName: 'withdraw',
		address: getRepCrowdSourcerAddress(),
		args: [amount]
	})
}

export const massWithdraw = async (client: WriteClient, addresses: AccountAddress[]) => {
	return await client.writeContract({
		abi: REP_CROWDSOURCER_ABI,
		functionName: 'massWithdraw',
		address: getRepCrowdSourcerAddress(),
		args: [addresses]
	})
}

export const micahCloseContract = async (client: WriteClient) => {
	return await client.writeContract({
		abi: REP_CROWDSOURCER_ABI,
		functionName: 'micahCloseContract',
		address: getRepCrowdSourcerAddress(),
		args: []
	})
}

export const micahWithdraw = async (client: WriteClient) => {
	return await client.writeContract({
		abi: REP_CROWDSOURCER_ABI,
		functionName: 'micahWithdraw',
		address: getRepCrowdSourcerAddress(),
		args: []
	})
}
