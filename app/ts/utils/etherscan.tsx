import { Signal, useComputed } from "@preact/signals"
import { AccountAddress } from "../types/types"

interface EtherScanAddressProps {
	name: string,
	address: Signal<AccountAddress> | undefined
}

export const EtherScanAddress = ({ address, name }: EtherScanAddressProps) => {
	if (address === undefined) return '?'
	const etherScan = useComputed(() => `https://etherscan.io/address/${ address.value }`)
	return <a target = '_blank' rel = 'noopener noreferrer' href = { etherScan }>{ name }</a>
}
