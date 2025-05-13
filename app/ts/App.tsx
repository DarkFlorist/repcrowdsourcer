import { Signal, useComputed, useSignal, useSignalEffect } from '@preact/signals'
import { createReadClient, createWriteClient, getAccounts, ReadClient, requestAccounts, WriteClient } from './utils/ethereumWallet.js'
import { OptionalSignal, useOptionalSignal } from './utils/OptionalSignal.js'
import { addressString, bigintToDecimalString, bigintToDecimalStringWithUnknown, bigintToDecimalStringWithUnknownAndPracticallyInfinite, decimalStringToBigint, getEthereumBalance, isDecimalString } from './utils/ethereumUtils.js'
import { getChainId } from 'viem/actions'
import { AccountAddress, EthereumAddress, EthereumQuantity } from './types/types.js'
import { useEffect } from 'preact/hooks'
import { deployRepCrowdSourcer, getRepCrowdSourcerAddress, isAugurConstantProductMarketRouterDeployed } from './utils/deployment.js'
import { approveErc20Token, getAllowanceErc20Token, getErc20TokenBalance } from './utils/erc20.js'
import { deposit, getBalance, getContractClosed, getMicahAddress, getMinBalanceToWithdraw, getTotalBalance, massWithdraw, micahCloseContract, micahWithdraw, repV2TokenAddress, withdraw } from './utils/callsAndWrites.js'
import { Input } from './utils/Input.js'

interface WalletComponentProps {
	maybeReadClient: OptionalSignal<ReadClient>
	maybeWriteClient: OptionalSignal<WriteClient>
	loadingAccount: Signal<boolean>
	children?: preact.ComponentChildren
}

const WalletComponent = ({ maybeReadClient, maybeWriteClient, loadingAccount, children }: WalletComponentProps) => {
	if (loadingAccount.value) return <></>
	const accountAddress = useComputed(() => maybeReadClient.deepValue?.account?.address)
	const connect = async () => {
		updateWalletSignals(maybeReadClient, maybeWriteClient, await requestAccounts())
	}
	return <div class = 'wallet-container'>
		{ accountAddress.value !== undefined ? <>
			<span class = 'wallet-connected-label'>
				Connected with { accountAddress.value }
			</span>
			{ children }
		</> : (
			<button class = 'wallet-connect-button' onClick = { connect }>
				Connect Wallet
			</button>
		) }
	</div>
}

interface WalletBalancesProps {
	repBalance: OptionalSignal<EthereumQuantity>
	ethBalance: OptionalSignal<EthereumQuantity>
}

const WalletBalances = ({ repBalance, ethBalance }: WalletBalancesProps) => {
	const balances = []
	if (ethBalance.deepValue !== undefined) balances.push(`${ bigintToDecimalString(ethBalance.deepValue, 18n, 2) } ETH`)
	if (repBalance.deepValue !== undefined) balances.push(`${ bigintToDecimalString(repBalance.deepValue, 18n, 2) } REP`)
	return <div class = 'wallet-balances'>
		{ balances.map((balance, i) => (
			<span key = { i }>{ balance }</span>
		)) }
	</div>
}

const updateWalletSignals = (maybeReadClient: OptionalSignal<ReadClient>, maybeWriteClient: OptionalSignal<WriteClient>, account: AccountAddress | undefined) => {
	maybeReadClient.deepValue = account === undefined ? createReadClient(undefined) : createWriteClient(account)
	maybeWriteClient.deepValue = account === undefined ? undefined : createWriteClient(account)
}

interface AllowancesProps {
	maybeWriteClient: OptionalSignal<WriteClient>
	allowedRep: OptionalSignal<bigint>
}

export const Allowances = ( { maybeWriteClient, allowedRep }: AllowancesProps) => {
	const repAllowanceToBeSet = useOptionalSignal<bigint>(undefined)
	const cannotSetRepAllowance = useComputed(() => {
		if (maybeWriteClient.deepValue === undefined) return true
		if (repAllowanceToBeSet.deepValue === undefined || repAllowanceToBeSet.deepValue <= 0n) return true
		return false
	})

	const approveRep = async () => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('missing writeClient')
		if (repAllowanceToBeSet.deepValue === undefined || repAllowanceToBeSet.deepValue <= 0n) throw new Error('not valid allowance')
		await approveErc20Token(writeClient, repV2TokenAddress, getRepCrowdSourcerAddress(), repAllowanceToBeSet.deepValue)
		allowedRep.deepValue = await getAllowanceErc20Token(writeClient, repV2TokenAddress, writeClient.account.address, getRepCrowdSourcerAddress())
	}

	function setMaxRepAllowance() {
		repAllowanceToBeSet.deepValue = 2n ** 256n - 1n
	}

	return <div class = 'form-grid'>
		<h3>Allowances</h3>
		<div style = { { display: 'grid', gap: '0.5em', gridTemplateColumns: 'auto auto auto' } }>
			<div style = { { alignContent: 'center' } }>
				Allowed REP: { bigintToDecimalStringWithUnknownAndPracticallyInfinite(allowedRep.deepValue, 18n, 2) } REP
			</div>
			<div style = { { display: 'flex', alignItems: 'baseline', gap: '0.5em' } }>
				<Input
					class = 'input reporting-panel-input'
					type = 'text'
					placeholder = 'DAI to allow'
					disabled = { useComputed(() => false) }
					style = { { maxWidth: '300px' } }
					value = { repAllowanceToBeSet }
					sanitize = { (amount: string) => amount.trim() }
					tryParse = { (amount: string | undefined) => {
						if (amount === undefined) return { ok: false } as const
						if (!isDecimalString(amount.trim())) return { ok: false } as const
						const parsed = decimalStringToBigint(amount.trim(), 18n)
						return { ok: true, value: parsed } as const
					}}
					serialize = { (amount: EthereumQuantity | undefined) => {
						if (amount === undefined) return ''
						return bigintToDecimalString(amount, 18n, 18)
					}}
				/>
				<span class = 'unit'>REP</span>
				<button class = 'button button-secondary button-small' style = { { whiteSpace: 'nowrap' } } onClick = { setMaxRepAllowance }>Max</button>
			</div>
			<button class = 'button button-secondary button-small' style = { { width: '100%', whiteSpace: 'nowrap' } } disabled = { cannotSetRepAllowance } onClick = { approveRep }>
				Set REP allowance
			</button>
		</div>
	</div>
}

export function App() {
	const loadingAccount = useSignal<boolean>(false)
	const isWindowEthereum = useSignal<boolean>(true)
	const maybeReadClient = useOptionalSignal<ReadClient>(undefined)
	const maybeWriteClient = useOptionalSignal<WriteClient>(undefined)
	const isDeployed = useOptionalSignal<boolean>(undefined)
	const chainId = useSignal<number | undefined>(undefined)
	const account = useOptionalSignal<AccountAddress>(undefined)

	const ethBalance = useOptionalSignal<EthereumQuantity>(undefined)
	const repBalance = useOptionalSignal<EthereumQuantity>(undefined)
	const micahAddress = useOptionalSignal<AccountAddress>(undefined)
	const totalBalance = useOptionalSignal<EthereumQuantity>(undefined)
	const requiredBalance = useOptionalSignal<EthereumQuantity>(undefined)
	const ourBalance = useOptionalSignal<EthereumQuantity>(undefined)
	const contractClosed = useOptionalSignal<boolean>(undefined)
	const repCrowdSourcerAddress = useSignal<AccountAddress>(getRepCrowdSourcerAddress())
	const allowedRep = useOptionalSignal<EthereumQuantity>(undefined)

	const depositRepInput = useOptionalSignal<EthereumQuantity>(undefined)
	const withdrawRepInput = useOptionalSignal<EthereumQuantity>(undefined)
	const withdrawAddreses = useOptionalSignal<AccountAddress[]>(undefined)

	const updateChainId = async () => {
		const readClient = maybeReadClient.deepPeek()
		if (readClient === undefined) return
		chainId.value = await getChainId(readClient)
	}

	useEffect(() => {
		if (window.ethereum === undefined) {
			isWindowEthereum.value = false
			return
		}
		isWindowEthereum.value = true
		window.ethereum.on('accountsChanged', (accounts) => {
			updateWalletSignals(maybeReadClient, maybeWriteClient, accounts[0])
			account.deepValue = accounts[0]
		})
		window.ethereum.on('chainChanged', async () => { updateChainId() })
		const fetchAccount = async () => {
			try {
				loadingAccount.value = true
				const fetchedAccount = await getAccounts()
				updateWalletSignals(maybeReadClient, maybeWriteClient, fetchedAccount)
				account.deepValue = fetchedAccount
				updateChainId()
				if (maybeReadClient.deepValue != undefined) {
					isDeployed.deepValue = await isAugurConstantProductMarketRouterDeployed(maybeReadClient.deepValue)
				}
			} catch(e) {
				console.error(e)
			} finally {
				loadingAccount.value = false
			}
		}
		fetchAccount()
	}, [])

	const deploy = async () => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) throw new Error('writeClient missing')
		await deployRepCrowdSourcer(writeClient)
		isDeployed.deepValue = true
	}

	const updateTokenBalances = async (writeClient: WriteClient | undefined) => {
		if (writeClient === undefined) return
		const ethPromise = getEthereumBalance(writeClient, writeClient.account.address)
		repBalance.deepValue = await getErc20TokenBalance(writeClient, repV2TokenAddress, writeClient.account.address)
		ethBalance.deepValue = await ethPromise
	}
	useSignalEffect(() => { updateTokenBalances(maybeWriteClient.deepValue).catch(console.error) })

	const refresh = async (writeClient: WriteClient | undefined, isDeployed: boolean | undefined) => {
		if (writeClient === undefined) return
		allowedRep.deepValue = await getAllowanceErc20Token(writeClient, repV2TokenAddress, writeClient.account.address, getRepCrowdSourcerAddress())
		if (isDeployed !== true) return
		micahAddress.deepValue = await getMicahAddress(writeClient)
		totalBalance.deepValue = await getTotalBalance(writeClient)
		requiredBalance.deepValue = await getMinBalanceToWithdraw(writeClient)
		contractClosed.deepValue = await getContractClosed(writeClient)
		ourBalance.deepValue = await getBalance(writeClient, writeClient.account.address)
	}
	const forceRefresh = () => refresh(maybeWriteClient.deepValue, isDeployed.deepValue).catch(console.error)
	useSignalEffect(() => { refresh(maybeWriteClient.deepValue, isDeployed.deepValue).catch(console.error) })

	const depositButtonDisabled = useComputed(() => {
		if (isDeployed.deepValue !== true) return true
		if (allowedRep.deepValue === undefined) return true
		if (depositRepInput.deepValue === undefined) return true
		if (depositRepInput.deepValue >= allowedRep.deepValue) return true
		if (contractClosed.deepValue === true) return true
		return false
	})

	const withdrawButtonDisabled = useComputed(() => {
		if (isDeployed.deepValue !== true) return true
		if (ourBalance.deepValue === undefined) return true
		if (ourBalance.deepValue <= 0n) return true
		return false
	})

	const massWithdrawButtonDisabled = useComputed(() => {
		if (isDeployed.deepValue !== true) return true
		if (contractClosed.deepValue === true) return false
		return true
	})

	const micahCloseContractButtonDisabled = useComputed(() => {
		if (isDeployed.deepValue !== true) return true
		if (contractClosed.deepValue === true) return true
		if (micahAddress.deepValue === undefined) return true
		if (maybeWriteClient.deepValue === undefined) return true
		if (maybeWriteClient.deepValue.account.address !== micahAddress.deepValue) return true
		return false
	})

	const buttonDeposit = async () => {
		if (maybeWriteClient.deepValue === undefined) throw new Error('wallet not connected')
		if (depositRepInput.deepValue === undefined || depositRepInput.deepValue <= 0) throw new Error('Deposit amount not set to non negative value')
		await deposit(maybeWriteClient.deepValue, depositRepInput.deepValue)
		await refresh(maybeWriteClient.deepValue, isDeployed.deepValue)
	}
	const buttonWithdraw = async () => {
		if (maybeWriteClient.deepValue === undefined) throw new Error('wallet not connected')
		if (withdrawRepInput.deepValue === undefined || withdrawRepInput.deepValue <= 0) throw new Error('Withdraw amount not set to non negative value')
		await withdraw(maybeWriteClient.deepValue, withdrawRepInput.deepValue)
		await refresh(maybeWriteClient.deepValue, isDeployed.deepValue)

	}
	const buttonMassWithdraw = async () => {
		if (maybeWriteClient.deepValue === undefined) throw new Error('wallet not connected')
		if (withdrawAddreses.deepValue === undefined || withdrawAddreses.deepValue.length === 0) throw new Error('Withdraw amount not set to non negative value')
		await massWithdraw(maybeWriteClient.deepValue, withdrawAddreses.deepValue)
		await refresh(maybeWriteClient.deepValue, isDeployed.deepValue)
	}

	const buttonMicahCloseContract = async () => {
		if (maybeWriteClient.deepValue === undefined) throw new Error('wallet not connected')
		if (maybeWriteClient.deepValue.account.address !== micahAddress.deepValue) throw new Error('you are not micah!')
		await micahCloseContract(maybeWriteClient.deepValue)
		await refresh(maybeWriteClient.deepValue, isDeployed.deepValue)
	}

	const buttonMicahWithdraw = async  () => {
		if (maybeWriteClient.deepValue === undefined) throw new Error('wallet not connected')
		if (maybeWriteClient.deepValue.account.address !== micahAddress.deepValue) throw new Error('you are not micah!')
		await micahWithdraw(maybeWriteClient.deepValue)
		await refresh(maybeWriteClient.deepValue, isDeployed.deepValue)
	}

	return <main style = 'overflow: auto;'>
		<div class = 'app'>
			<div style = 'display: grid; justify-content: space-between; padding: 10px; grid-template-columns: auto auto auto;'>
				<div class = 'augur-constant-product-market'>
					<img src = 'favicon.ico' alt = 'Icon' />
					<div>
						<span>REP Crowd Sourcer</span>
					</div>
				</div>
				{ isDeployed.deepValue === false ? <button class = 'button button-primary' onClick = { deploy }>Deploy Crodwsourcer</button> : <div></div> }
				<div style = 'display: flex; align-items: center;'>
					<WalletComponent loadingAccount = { loadingAccount } maybeReadClient = { maybeReadClient } maybeWriteClient = { maybeWriteClient }>
						<WalletBalances ethBalance = { ethBalance } repBalance = { repBalance }/>
					</WalletComponent>
				</div>
			</div>
		</div>
		<div class = 'create-market'>
			<div class = 'form-grid'>
				<div class = 'form-group'>
					<h3>Contract Status</h3>
					<div>
						<p>REP CrowdSourcer Address: { repCrowdSourcerAddress.value } </p>
						<p>Micah Address: { micahAddress.deepValue }</p>
						<p>Balance: { bigintToDecimalStringWithUnknown(totalBalance.deepValue, 18n, 2) } REP / { bigintToDecimalStringWithUnknown(requiredBalance.deepValue, 18n, 2) } REP</p>
						<p>Our Balance: { bigintToDecimalStringWithUnknown(ourBalance.deepValue, 18n, 2) } REP</p>
						<p>Contract Closed: { contractClosed.deepValue ? 'YES' : 'No' }</p>
					</div>
					<button class = { 'button button-secondary button-small' } onClick = { forceRefresh }> Refresh </button>
					<Allowances maybeWriteClient = { maybeWriteClient } allowedRep = { allowedRep }/>
				</div>
				<div class = 'form-group'>
					<h3>Deposit REP</h3>
					<div style = { { display: 'flex', alignItems: 'baseline', gap: '0.5em' } }>
						<Input
							class = 'input reporting-panel-input'
							type = 'text'
							placeholder = 'DAI to allow'
							disabled = { depositButtonDisabled }
							style = { { maxWidth: '300px' } }
							value = { depositRepInput }
							sanitize = { (amount: string) => amount.trim() }
							tryParse = { (amount: string | undefined) => {
								if (amount === undefined) return { ok: false } as const
								if (!isDecimalString(amount.trim())) return { ok: false } as const
								const parsed = decimalStringToBigint(amount.trim(), 18n)
								return { ok: true, value: parsed } as const
							}}
							serialize = { (amount: EthereumQuantity | undefined) => {
								if (amount === undefined) return ''
								return bigintToDecimalString(amount, 18n, 18)
							}}
						/>
						<span class = 'unit'>REP</span>
						<button class = { 'button button-primary' } onClick = { buttonDeposit } disabled = { depositButtonDisabled.value }> Deposit </button>
					</div>
				</div>
				<div class = 'form-group'>
					<h3>Withdraw REP</h3>
					<div style = { { display: 'flex', alignItems: 'baseline', gap: '0.5em' } }>
						<Input
							class = 'input reporting-panel-input'
							type = 'text'
							placeholder = 'DAI to allow'
							disabled = { withdrawButtonDisabled }
							style = { { maxWidth: '300px' } }
							value = { withdrawRepInput }
							sanitize = { (amount: string) => amount.trim() }
							tryParse = { (amount: string | undefined) => {
								if (amount === undefined) return { ok: false } as const
								if (!isDecimalString(amount.trim())) return { ok: false } as const
								const parsed = decimalStringToBigint(amount.trim(), 18n)
								return { ok: true, value: parsed } as const
							}}
							serialize = { (amount: EthereumQuantity | undefined) => {
								if (amount === undefined) return ''
								return bigintToDecimalString(amount, 18n, 18)
							}}
						/>
						<span class = 'unit'>REP</span>
						<button class = { 'button button-primary' } onClick = { buttonWithdraw } disabled = { withdrawButtonDisabled.value }> Withdraw </button>
					</div>
				</div>
				<div class = 'form-group'>
					<h3>Mass withdraw</h3>
					<div style = { { display: 'flex', alignItems: 'baseline', gap: '0.5em' } }>
						<Input
							style = 'height: fit-content;'
							key = 'designated-reporter-address'
							class = 'input'
							type = 'text'
							width = '100%'
							placeholder = '0x123., 0x231..'
							value = { withdrawAddreses }
							disabled = { massWithdrawButtonDisabled }
							sanitize = { (addressString: string) => addressString }
							tryParse = { (maybeStringSeparatedArray: string | undefined) => {
								if (maybeStringSeparatedArray === undefined) return { ok: false } as const
								const addresses = maybeStringSeparatedArray.split(',').map((element) => EthereumAddress.safeParse(element.trim()))
								const addressStrings = addresses.map((address) => address.success ? addressString(address.value) : undefined)
								const validOnes = addressStrings.filter((address): address is `0x${ string }` => address !== undefined)
								if (validOnes.length !== addressStrings.length) return { ok: false }
								return { ok: true, value: validOnes } as const
							}}
							serialize = { (marketAddressString: readonly string[] | undefined) => {
								if (marketAddressString === undefined) return ''
								return marketAddressString.join(', ')
							} }
							invalidSignal = { useSignal<boolean>(false) }
						/>
						<button class = { 'button button-primary' } onClick = { buttonMassWithdraw } disabled = { massWithdrawButtonDisabled.value }> Mass Withdraw </button>
					</div>
				</div>
				<div class = 'form-group'>
					<h3>Micah Section</h3>
					<div>
						<button class = { 'button button-primary' } onClick = { buttonMicahWithdraw } disabled = { micahCloseContractButtonDisabled.value }> Micah Withdraw & Close</button>
						<button class = { 'button button-secondary' } onClick = { buttonMicahCloseContract } disabled = { micahCloseContractButtonDisabled.value }> Micah Close Contract Without Withdraw</button>
					</div>
				</div>
			</div>
		</div>
		<footer class = 'site-footer'>
			<div>
				Augur Constant Product Market by&nbsp;
				<a href = 'https://dark.florist' target = '_blank' rel = 'noopener noreferrer'>
					Dark Florist
				</a>
			</div>
			<nav class = 'footer-links'>
				<a href = 'https://discord.gg/BeFnJA5Kjb' target = '_blank'>Discord</a>
				<a href = 'https://twitter.com/DarkFlorist' target = '_blank'>Twitter</a>
				<a href = 'https://github.com/DarkFlorist' target = '_blank'>GitHub</a>
			</nav>
		</footer>
	</main>
}
