import { Signal, useComputed } from '@preact/signals'
import { AccountAddress } from '../types/types.js'

interface EtherScanAddressProps {
	name: string,
	address: Signal<AccountAddress> | undefined
}

export const EtherScanAddress = ({ address, name }: EtherScanAddressProps) => {
	if (address === undefined) return '?'
	const etherScan = useComputed(() => `https://etherscan.io/address/${ address.value }`)
	return <a style = { { display: 'inline-flex', alignItems: 'flex-end' } } target = '_blank' rel = 'noopener noreferrer' href = { etherScan }>{ name }
		<svg class = 'external-link' width = '24px' height = '24px' viewBox = '0 0 24 24'><g stroke-width = '2.1' fill = 'none' stroke-linecap = 'round' stroke-linejoin = 'round'><polyline points = '17 13.5 17 19.5 5 19.5 5 7.5 11 7.5'></polyline><path d = 'M14,4.5 L20,4.5 L20,10.5 M20,4.5 L11,13.5'></path></g></svg>
	</a>
}
