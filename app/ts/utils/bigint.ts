export const addressString = (address: bigint): `0x${ string }` => `0x${ address.toString(16).padStart(40, '0') }`

export const ethereumAddressSafeParse = (address: string) => {
	if (!/^0x([a-fA-F0-9]{40})$/.test(address)) return { success: false, message: `${ address } is not a hex string encoded address.` } as const
	return { success: true, value: BigInt(address) } as const
}
