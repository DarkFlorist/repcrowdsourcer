import { Signal, useComputed, useSignal, useSignalEffect } from '@preact/signals'
import { createReadClient, createWriteClient, getAccounts, ReadClient, requestAccounts, WriteClient } from './utils/ethereumWallet.js'
import { OptionalSignal, useOptionalSignal } from './utils/OptionalSignal.js'
import { addressString, bigintToDecimalString, bigintToDecimalStringWithUnknown, bigintToDecimalStringWithUnknownAndPracticallyInfinite, decimalStringToBigint, getEthereumBalance, isDecimalString } from './utils/ethereumUtils.js'
import { getChainId } from 'viem/actions'
import { useEffect } from 'preact/hooks'
import { deployRepCrowdsourcer, getRepCrowdSourcerAddress, isRepCrowdSourcerDeployed } from './utils/deployment.js'
import { approveErc20Token, getAllowanceErc20Token, getErc20TokenBalance } from './utils/erc20.js'
import { deposit, getBalance, getContractClosed, getMicahAddress, getMinBalanceToWithdraw, getTotalBalance, getWithdrawsEnabled, massWithdraw, micahCloseContract, micahSetWithdrawsEnabled, micahWithdraw, repV2TokenAddress, withdraw } from './utils/callsAndWrites.js'
import { Input } from './utils/Input.js'
import { printError } from './utils/misc.js'
import { UnexpectedError } from './utils/error.js'
import { AccountAddress } from './types/types.js'
import { ethereumAddressSafeParse } from './utils/bigint.js'
import { EtherScanAddress } from './utils/etherscan.js'

interface WalletComponentProps {
	maybeReadClient: OptionalSignal<ReadClient>
	maybeWriteClient: OptionalSignal<WriteClient>
	account: OptionalSignal<AccountAddress>
	loadingAccount: Signal<boolean>
	children?: preact.ComponentChildren
}

const WalletComponent = ({ maybeReadClient, maybeWriteClient, loadingAccount, account, children }: WalletComponentProps) => {
	if (loadingAccount.value) return <></>
	const connect = async () => {
		updateWalletSignals(maybeReadClient, maybeWriteClient, account, await requestAccounts())
	}
	return <div class = 'wallet-container'>
		{ account.deepValue !== undefined ? <>
			<span class = 'wallet-connected-label'>
				Connected with { account.deepValue }
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
	repBalance: OptionalSignal<bigint>
	ethBalance: OptionalSignal<bigint>
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

const updateWalletSignals = (maybeReadClient: OptionalSignal<ReadClient>, maybeWriteClient: OptionalSignal<WriteClient>, account: OptionalSignal<AccountAddress>, newAccount: AccountAddress | undefined) => {
	maybeReadClient.deepValue = newAccount === undefined ? createReadClient(undefined) : createWriteClient(newAccount)
	maybeWriteClient.deepValue = newAccount === undefined ? undefined : createWriteClient(newAccount)
	account.deepValue = newAccount
}

export function App() {
	const loadingAccount = useSignal<boolean>(false)
	const isWindowEthereum = useSignal<boolean>(true)
	const maybeReadClient = useOptionalSignal<ReadClient>(undefined)
	const maybeWriteClient = useOptionalSignal<WriteClient>(undefined)
	const isDeployed = useOptionalSignal<boolean>(undefined)
	const chainId = useSignal<number | undefined>(undefined)
	const account = useOptionalSignal<AccountAddress>(undefined)

	const ethBalance = useOptionalSignal<bigint>(undefined)
	const repBalance = useOptionalSignal<bigint>(undefined)
	const micahAddress = useOptionalSignal<AccountAddress>(undefined)
	const totalBalance = useOptionalSignal<bigint>(undefined)
	const requiredBalance = useOptionalSignal<bigint>(undefined)
	const ourBalance = useOptionalSignal<bigint>(undefined)
	const contractClosed = useOptionalSignal<boolean>(undefined)
	const contractWithdrawsEnabled = useOptionalSignal<boolean>(undefined)
	const allowedRep = useOptionalSignal<bigint>(undefined)

	const depositRepInput = useOptionalSignal<bigint>(undefined)
	const withdrawAddreses = useOptionalSignal<AccountAddress[]>(undefined)

	const unexpectedError = useOptionalSignal<string>(undefined)

	const handleUnexpectedError = (error: unknown) => {
		printError(error)
		unexpectedError.deepValue = typeof error === 'object' && error !== null && 'message' in error && error.message !== undefined && typeof error.message === 'string' ? error.message : 'Please see The Interceptors console for more details on the error.'
	}
	const clearError = () => {
		unexpectedError.deepValue = undefined
	}

	const updateChainId = async () => {
		const readClient = maybeReadClient.deepPeek()
		if (readClient === undefined) return
		chainId.value = await getChainId(readClient)
	}
	useSignalEffect(() => {
		maybeReadClient.deepValue
		maybeWriteClient.deepValue
		account.value
		updateChainId()
	})

	const fundedPercentageString = useComputed(() => {
		if (requiredBalance.deepValue === undefined) return '?%'
		if (totalBalance.deepValue === undefined) return '?%'
		return `${ bigintToDecimalString(totalBalance.deepValue * 10000n / requiredBalance.deepValue, 2n, 2) }%`
	})

	useEffect(() => {
		if (window.ethereum === undefined) {
			isWindowEthereum.value = false
			updateWalletSignals(maybeReadClient, maybeWriteClient, account, undefined)
			return
		}
		isWindowEthereum.value = true
		window.ethereum.on('accountsChanged', (accounts) => updateWalletSignals(maybeReadClient, maybeWriteClient, account, accounts[0]))
		window.ethereum.on('chainChanged', async () => { updateChainId() })
		const fetchAccount = async () => {
			console.log('fetchaccount')
			try {
				loadingAccount.value = true
				const fetchedAccount = await getAccounts()
				updateWalletSignals(maybeReadClient, maybeWriteClient, account, fetchedAccount)
				updateChainId()
			} catch(e) {
				handleUnexpectedError(e)
			} finally {
				loadingAccount.value = false
			}
		}
		fetchAccount()
	}, [])

	const deploy = async () => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) return handleUnexpectedError(new Error('writeClient missing'))
		if (chainId.value !== 1) return handleUnexpectedError(new Error('wrong network'))
		await deployRepCrowdsourcer(writeClient)
		isDeployed.deepValue = true
	}

	const updateTokenBalances = async (writeClient: WriteClient | undefined, chainId: number | undefined) => {
		if (writeClient === undefined) return
		if (account.deepValue === undefined) return
		if (chainId !== 1) return
		const ethPromise = getEthereumBalance(writeClient, account.deepValue)
		repBalance.deepValue = await getErc20TokenBalance(writeClient, repV2TokenAddress, account.deepValue)
		ethBalance.deepValue = await ethPromise
	}
	useSignalEffect(() => { updateTokenBalances(maybeWriteClient.deepValue, chainId.value).catch(handleUnexpectedError) })

	const checkIfDeployed = async (readClient: ReadClient | undefined, chainId: number | undefined) => {
		if (readClient === undefined) return
		if (chainId !== 1) return
		isDeployed.deepValue = await isRepCrowdSourcerDeployed(readClient)
	}

	useSignalEffect(() => { checkIfDeployed(maybeReadClient.deepValue, chainId.value).catch(handleUnexpectedError) })

	const refresh = async (readClient: ReadClient | undefined, writeClient: WriteClient | undefined, isDeployed: boolean | undefined, chainId: number | undefined) => {
		if (isDeployed !== true) return
		if (readClient === undefined) return
		micahAddress.deepValue = await getMicahAddress(readClient)
		totalBalance.deepValue = await getTotalBalance(readClient)
		contractClosed.deepValue = await getContractClosed(readClient)
		requiredBalance.deepValue = await getMinBalanceToWithdraw(readClient)
		if (account.deepValue === undefined) return
		if (writeClient === undefined) return
		allowedRep.deepValue = await getAllowanceErc20Token(readClient, repV2TokenAddress, account.deepValue, getRepCrowdSourcerAddress())
		ourBalance.deepValue = await getBalance(writeClient, account.deepValue)
		contractWithdrawsEnabled.deepValue = await getWithdrawsEnabled(writeClient)
		await updateTokenBalances(writeClient, chainId)
	}
	useSignalEffect(() => { refresh(maybeReadClient.deepValue, maybeWriteClient.deepValue, isDeployed.deepValue, chainId.value).catch(handleUnexpectedError) })

	const isMicah = useComputed(() => {
		if (maybeWriteClient.deepValue === undefined) return false
		if (micahAddress.deepValue === undefined) return false
		return BigInt(maybeWriteClient.deepValue.account.address) === BigInt(micahAddress.deepValue)
	})

	const depositInputDisabled = useComputed(() => {
		if (isDeployed.deepValue !== true) return true
		if (allowedRep.deepValue === undefined) return true
		if (contractClosed.deepValue === true) return true
		if (chainId.value !== 1) return true
		return false
	})

	const depositButtonDisabled = useComputed(() => {
		if (depositInputDisabled.value) return true
		if (depositRepInput.deepValue === undefined) return true
		if (allowedRep.deepValue === undefined) return true
		if (repBalance.deepValue === undefined) return true
		if (depositRepInput.deepValue > allowedRep.deepValue) return true
		if (depositRepInput.deepValue > repBalance.deepValue) return true
		if (depositRepInput.deepValue === 0n) return true
		if (chainId.value !== 1) return true
		return false
	})

	const withdrawButtonDisabled = useComputed(() => {
		if (isDeployed.deepValue !== true) return true
		if (ourBalance.deepValue === undefined) return true
		if (ourBalance.deepValue <= 0n) return true
		if (chainId.value !== 1) return true
		return false
	})

	const massWithdrawInputDisabled = useComputed(() => {
		if (isDeployed.deepValue !== true) return true
		if (contractClosed.deepValue !== true) return true
		if (chainId.value !== 1) return true
		return false
	})
	const massWithdrawButtonDisabled = useComputed(() => {
		if (massWithdrawInputDisabled.value) return true
		if (withdrawAddreses.deepValue === undefined) return true
		if (withdrawAddreses.deepValue.length === 0) return true
		if (chainId.value !== 1) return true
		return false
	})

	const micahCloseContractButtonDisabled = useComputed(() => {
		if (isDeployed.deepValue !== true) return true
		if (contractClosed.deepValue === true) return true
		if (!isMicah.value) return true
		if (chainId.value !== 1) return true
		return false
	})

	const buttonMicahSetWithdrawsEnabledDisabled = useComputed(() => {
		if (!isMicah.value) return true
		if (contractWithdrawsEnabled.deepValue) return true
		return false
	})

	const micahWithdrawDisabled = useComputed(() => {
		if (micahCloseContractButtonDisabled.value) return true
		if (totalBalance.deepValue === undefined) return true
		if (requiredBalance.deepValue === undefined) return true
		if (totalBalance.deepValue < requiredBalance.deepValue) return true
		if (chainId.value !== 1) return true
		return false
	})

	const cannotSetRepAllowance = useComputed(() => {
		if (maybeWriteClient.deepValue === undefined) return true
		if (depositRepInput.deepValue === undefined || depositRepInput.deepValue <= 0n) return true
		if (allowedRep.deepValue === undefined) return true
		if (repBalance.deepValue === undefined) return true
		if (allowedRep.deepValue >= depositRepInput.deepValue) return true
		if (depositRepInput.deepValue > repBalance.deepValue) return true
		return false
	})

	const approveRep = async () => {
		const writeClient = maybeWriteClient.deepPeek()
		if (writeClient === undefined) return handleUnexpectedError(new Error('missing writeClient'))
		if (depositRepInput.deepValue === undefined || depositRepInput.deepValue <= 0n) return handleUnexpectedError(new Error('not valid allowance'))
		await approveErc20Token(writeClient, repV2TokenAddress, getRepCrowdSourcerAddress(), depositRepInput.deepValue).catch(handleUnexpectedError)
		try {
			allowedRep.deepValue = await getAllowanceErc20Token(writeClient, repV2TokenAddress, writeClient.account.address, getRepCrowdSourcerAddress())
		} catch(error: unknown) {
			return handleUnexpectedError(error)
		}
	}

	const buttonDeposit = async () => {
		if (maybeWriteClient.deepValue === undefined) return handleUnexpectedError(new Error('wallet not connected'))
		if (depositRepInput.deepValue === undefined || depositRepInput.deepValue <= 0) return handleUnexpectedError(new Error('Deposit amount not set to non negative value'))
		await deposit(maybeWriteClient.deepValue, depositRepInput.deepValue).catch(handleUnexpectedError)
		await refresh(maybeReadClient.deepValue, maybeWriteClient.deepValue, isDeployed.deepValue, chainId.value).catch(handleUnexpectedError)
	}
	const buttonWithdraw = async () => {
		if (maybeWriteClient.deepValue === undefined) return handleUnexpectedError(new Error('wallet not connected'))
		await withdraw(maybeWriteClient.deepValue).catch(handleUnexpectedError)
		await refresh(maybeReadClient.deepValue, maybeWriteClient.deepValue, isDeployed.deepValue, chainId.value).catch(handleUnexpectedError)
	}
	const buttonMassWithdraw = async () => {
		if (maybeWriteClient.deepValue === undefined) return handleUnexpectedError(new Error('wallet not connected'))
		if (withdrawAddreses.deepValue === undefined || withdrawAddreses.deepValue.length === 0) return handleUnexpectedError(new Error('Withdraw amount not set to non negative value'))
		await massWithdraw(maybeWriteClient.deepValue, withdrawAddreses.deepValue).catch(handleUnexpectedError)
		await refresh(maybeReadClient.deepValue, maybeWriteClient.deepValue, isDeployed.deepValue, chainId.value).catch(handleUnexpectedError)
	}

	const buttonMicahCloseContract = async () => {
		if (maybeWriteClient.deepValue === undefined) return handleUnexpectedError(new Error('wallet not connected'))
		if (isMicah.value !== true) return handleUnexpectedError(new Error('you are not micah!'))
		await micahCloseContract(maybeWriteClient.deepValue).catch(handleUnexpectedError)
		await refresh(maybeReadClient.deepValue, maybeWriteClient.deepValue, isDeployed.deepValue, chainId.value).catch(handleUnexpectedError)
	}

	const buttonMicahWithdraw = async () => {
		if (maybeWriteClient.deepValue === undefined) return handleUnexpectedError(new Error('wallet not connected'))
		if (isMicah.value !== true) return handleUnexpectedError(new Error('you are not micah!'))
		await micahWithdraw(maybeWriteClient.deepValue).catch(handleUnexpectedError)
		await refresh(maybeReadClient.deepValue, maybeWriteClient.deepValue, isDeployed.deepValue, chainId.value).catch(handleUnexpectedError)
	}

	const buttonMicahSetWithdrawsEnabled = async () => {
		if (maybeWriteClient.deepValue === undefined) return handleUnexpectedError(new Error('wallet not connected'))
		if (isMicah.value !== true) return handleUnexpectedError(new Error('you are not micah!'))
		await micahSetWithdrawsEnabled(maybeWriteClient.deepValue).catch(handleUnexpectedError)
		await refresh(maybeReadClient.deepValue, maybeWriteClient.deepValue, isDeployed.deepValue, chainId.value).catch(handleUnexpectedError)
	}

	return <main style = 'overflow: auto;'>
		<div style = 'display: grid; justify-content: space-between; padding: 10px; grid-template-columns: auto auto;'>
			<div class = 'crowdsourcer-header'>
				<img src = 'favicon.ico' alt = 'Icon' />
				<div>
					<span>REP Crowdsourcer</span>
				</div>
			</div>
			<div style = 'display: flex; align-items: center;'>
				<WalletComponent loadingAccount = { loadingAccount } maybeReadClient = { maybeReadClient } maybeWriteClient = { maybeWriteClient } account = { account }>
					<WalletBalances ethBalance = { ethBalance } repBalance = { repBalance }/>
				</WalletComponent>
			</div>
		</div>

		<div class = 'funding-status'>
			<div class = 'funding-circle'>
				<span class = 'percent'> { fundedPercentageString.value }</span>
			</div>
			<div class = 'balance'>
				{ bigintToDecimalStringWithUnknown(totalBalance.deepValue, 18n, 2) } REP / { bigintToDecimalStringWithUnknown(requiredBalance.deepValue, 18n, 2) } REP
			</div>
		</div>

		<div class = 'main-window'>
			{ isDeployed.deepValue === false && chainId.value === 1 ? <button class = 'button button-primary' onClick = { deploy }>Deploy Crodwsourcer</button> : <div></div> }

			<UnexpectedError close = { clearError } unexpectedError = { unexpectedError }/>
			{ chainId.value !== undefined && chainId.value !== 1 ? <div class = 'warning-box'>
				<p> Please switch to mainnet </p>
			</div> : <></> }
			<div class = 'form-grid'>
				{ contractClosed.deepValue ? <div class = 'warning-box'>
					<p> REP Crowdsourcer has been closed. Users having a balance in the contract can withdraw it. Deposits are closed.</p>
				</div> : <></> }

				<div class = 'form-group highlight'>
					<h3>Fund AugurV2 Fork</h3>
					<p>
						Deposit REP to { <EtherScanAddress name = { 'REP Crowdsourcer' } address = { useComputed(() => getRepCrowdSourcerAddress()) }/> } that Micah can withdraw from once <b>{ bigintToDecimalStringWithUnknown(requiredBalance.deepValue, 18n, 2) } REP</b> is reached. Micah commits (via a gentleman's agreement) to use all of the REP to fund an Augur v2 fork. The REP will be lost. Please find Micah's more detailed explanation from <a href = '/blog.html' target = '_blank' rel = 'noopener noreferrer'>Who Am I</a>.
						<br/><br/>
						If you are able to exploit this contract and successfully withdraw its funds, you are requested to return <b>90%</b> of the recovered assets to <EtherScanAddress name = { 'Micah' } address = { micahAddress.value }/>. You may retain the remaining <b>10%</b> as a bounty for your efforts. By interacting with this contract, users acknowledge and agree to these terms.
						<br/><br/>
						To deposit funds, input the deposit amount and allow crowdsourcer to spend that amount, then initiate the actual deposit. Current allowance: <b>{ bigintToDecimalStringWithUnknownAndPracticallyInfinite(allowedRep.deepValue, 18n, 2) } REP.</b>
					</p>
					<div style = { { display: 'flex', alignItems: 'baseline', gap: '0.5em', flexFlow: 'wrap' } }>
						<Input
							class = 'input reporting-panel-input'
							type = 'text'
							placeholder = 'REP to deposit'
							disabled = { depositInputDisabled.value }
							style = { { maxWidth: '300px' } }
							value = { depositRepInput }
							sanitize = { (amount: string) => amount.trim() }
							tryParse = { (amount: string | undefined) => {
								if (amount === undefined) return { ok: false } as const
								if (!isDecimalString(amount.trim())) return { ok: false } as const
								const parsed = decimalStringToBigint(amount.trim(), 18n)
								return { ok: true, value: parsed } as const
							}}
							serialize = { (amount: bigint | undefined) => {
								if (amount === undefined) return ''
								return bigintToDecimalString(amount, 18n, 18)
							}}
						/>
						<span class = 'unit'>REP</span>
						<div style = { { display: 'flex', gap: '0.5em' } }>
							<button class = 'button-primary' disabled = { cannotSetRepAllowance } onClick = { approveRep }>
								Allow
							</button>
							<button class = { 'button button-primary' } onClick = { buttonDeposit } disabled = { depositButtonDisabled.value }> Deposit </button>
						</div>
					</div>
				</div>
				<div class = 'form-group'>
					<h3>Claim Deposit Back</h3>
					<p>You have { bigintToDecimalStringWithUnknown(ourBalance.deepValue, 18n, 2) } REP deposited in the contract. You can withdraw your REP as long as its not withdrawn by Micah.</p>
					<div style = { 'display: flex; align-items: baseline; gap: 0.5em;' }>
						<button class = { 'button button-primary' } onClick = { buttonWithdraw } disabled = { withdrawButtonDisabled.value }> Return Deposit </button>
					</div>
					<p>If contract is closed, mass withdraw any deposit:</p>
					<div class = 'micah-buttons'>
						<Input
							style = 'height: fit-content;'
							key = 'designated-reporter-address'
							class = 'input'
							type = 'text'
							width = '100%'
							placeholder = '0x123., 0x231..'
							value = { withdrawAddreses }
							disabled = { massWithdrawInputDisabled.value }
							sanitize = { (addressString: string) => addressString }
							tryParse = { (maybeStringSeparatedArray: string | undefined) => {
								if (maybeStringSeparatedArray === undefined) return { ok: false } as const
								const addresses = maybeStringSeparatedArray.split(',').map((element) => ethereumAddressSafeParse(element.trim()))
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
						<button class = { 'button button-primary' } onClick = { buttonMassWithdraw } disabled = { massWithdrawButtonDisabled.value }> Return Deposits </button>
					</div>
				</div>
				<div class = 'form-group'>
					<h3>Micah Section</h3>
					<p>When contracts balance Reaches { bigintToDecimalStringWithUnknown(requiredBalance.deepValue, 18n, 2) } REP Micah can withdraw it all.</p>
					<div class = 'micah-buttons'>
						<button class = { 'button button-primary' } onClick = { buttonMicahWithdraw } disabled = { micahWithdrawDisabled.value }> Withdraw & Close</button>
						<button class = { 'button button-primary' } onClick = { buttonMicahCloseContract } disabled = { micahCloseContractButtonDisabled.value }> Don't Withdraw & Close</button>
						<button class = { 'button button-primary' } onClick = { buttonMicahSetWithdrawsEnabled } disabled = { buttonMicahSetWithdrawsEnabledDisabled.value }> Enable Withdraws</button>
					</div>
				</div>
			</div>
		</div>
		<footer class = 'site-footer'>
			<div>
				REP Crowdsourcer by&nbsp;
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
