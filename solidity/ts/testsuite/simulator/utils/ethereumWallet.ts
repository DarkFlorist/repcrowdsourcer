import 'viem/window'
import { createWalletClient, custom, EIP1193Provider, publicActions } from 'viem'
import { mainnet } from 'viem/chains'
import { addressString } from './bigint.js'

export const requestAccounts = async () => {
	if (window.ethereum === undefined) throw new Error('no window.ethereum injected')
	const reply = await window.ethereum.request({ method: 'eth_requestAccounts', params: undefined })
	return reply[0]
}

export const getAccounts = async () => {
	if (window.ethereum === undefined) throw new Error('no window.ethereum injected')
	const reply = await window.ethereum.request({ method: 'eth_accounts', params: undefined })
	return reply[0]
}

export const createWriteClient = (ethereum: EIP1193Provider | undefined, accountAddress: bigint, cacheTime: number = 10_000) => {
	if (ethereum === undefined) throw new Error('no window.ethereum injected')
	if (accountAddress === undefined) throw new Error('no accountAddress!')
	return createWalletClient({ account: addressString(accountAddress), chain: mainnet, transport: custom(ethereum), cacheTime: cacheTime }).extend(publicActions)
}

export type WriteClient = ReturnType<typeof createWriteClient>
export type ReadClient = WriteClient

export const getChainId = async (readClient: ReadClient) => {
	return await readClient.getChainId()
}
