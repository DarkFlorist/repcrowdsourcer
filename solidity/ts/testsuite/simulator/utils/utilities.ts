import 'viem/window'
import { encodeAbiParameters, keccak256 } from 'viem'
import { repV2TokenAddress, TEST_ADDRESSES } from './constants.js'
import { addressString } from './bigint.js'
import { Address } from 'viem'
import { MockWindowEthereum } from '../MockWindowEthereum.js'

export async function sleep(milliseconds: number) {
	await new Promise(resolve => setTimeout(resolve, milliseconds))
}

export function jsonStringify(value: unknown, space?: string | number | undefined): string {
    return JSON.stringify(value, (_, value) => {
		if (typeof value === 'bigint') return `0x${value.toString(16)}n`
		if (value instanceof Uint8Array) return `b'${Array.from(value).map(x => x.toString(16).padStart(2, '0')).join('')}'`
		// cast works around https://github.com/uhyo/better-typescript-lib/issues/36
		return value as JSONValueF<unknown>
    }, space)
}

export function jsonParse(text: string): unknown {
	return JSON.parse(text, (_key: string, value: unknown) => {
		if (typeof value !== 'string') return value
		if (/^0x[a-fA-F0-9]+n$/.test(value)) return BigInt(value.slice(0, -1))
		const bytesMatch = /^b'(:<hex>[a-fA-F0-9])+'$/.exec(value)
		if (bytesMatch && 'groups' in bytesMatch && bytesMatch.groups && 'hex' in bytesMatch.groups && bytesMatch.groups['hex'].length % 2 === 0) return hexToBytes(`0x${bytesMatch.groups['hex']}`)
		return value
	})
}

export function ensureError(caught: unknown) {
	return (caught instanceof Error) ? caught
		: typeof caught === 'string' ? new Error(caught)
		: typeof caught === 'object' && caught !== null && 'message' in caught && typeof caught.message === 'string' ? new Error(caught.message)
		: new Error(`Unknown error occurred.\n${jsonStringify(caught)}`)
}

function hexToBytes(value: string) {
	const result = new Uint8Array((value.length - 2) / 2)
	for (let i = 0; i < result.length; ++i) {
		result[i] = Number.parseInt(value.slice(i * 2 + 2, i * 2 + 4), 16)
	}
	return result
}

export function dataString(data: Uint8Array | null) {
	if (data === null) return ''
	return Array.from(data).map(x => x.toString(16).padStart(2, '0')).join('')
}

export function dataStringWith0xStart(data: Uint8Array | null): `0x${ string }` {
	if (data === null) return '0x'
	return `0x${ dataString(data) }`
}

export function assertNever(value: never): never {
	throw new Error(`Unhandled discriminated union member: ${JSON.stringify(value)}`)
}

export function isSameAddress(address1: `0x${ string }` | undefined, address2: `0x${ string }` | undefined) {
	if (address1 === undefined && address2 === undefined) return true
	if (address1 === undefined || address2 === undefined) return false
	return address1.toLowerCase() === address2.toLowerCase()
}

export function bigIntToNumber(value: bigint): number {
	if (value <= Number.MAX_SAFE_INTEGER && value >= Number.MIN_SAFE_INTEGER) {
		return Number(value)
	}
	throw new Error(`Value: "${ value }" is out of bounds to be a Number.`)
}

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

export const mintETH = async (mockWindowEthereum: MockWindowEthereum, mintAmounts: { address: Address, amount: bigint }[]) => {
	const stateOverrides = mintAmounts.reduce((acc, current) => {
		acc[current.address] = { balance: current.amount }
		return acc
	}, {} as { [key: string]: {[key: string]: bigint }} )
	await mockWindowEthereum.addStateOverrides(stateOverrides)
}

export const mintRep = async (mockWindowEthereum: MockWindowEthereum, mintAmounts: { address: Address, amount: bigint }[]) => {
	const repAddress = repV2TokenAddress
	const overrides = mintAmounts.map((mintAmount) => {
		const encodedKeySlotHash = keccak256(encodeAbiParameters([{ type: 'address' }, { type: 'uint256' }], [mintAmount.address, 1n]))
		return { key: encodedKeySlotHash, value: mintAmount.amount }
	})
	const stateSets = overrides.reduce((acc, current) => {
		acc[current.key] = current.value
		return acc
	}, {} as { [key: string]: bigint } )
	await mockWindowEthereum.addStateOverrides({ [repAddress]: { stateDiff: stateSets }})
}
export const setupTestAccounts = async (mockWindowEthereum: MockWindowEthereum) => {
	const accountValues = TEST_ADDRESSES.map((address) => {
		return { address: addressString(address), amount: 1000000n * 10n**18n}
	})
	await mintETH(mockWindowEthereum, accountValues)
	await mintRep(mockWindowEthereum, accountValues)
}
