import { describe, beforeEach, test } from 'node:test'
import { getMockedEthSimulateWindowEthereum, MockWindowEthereum } from '../testsuite/simulator/MockWindowEthereum.js'
import { createWriteClient } from '../testsuite/simulator/utils/viem.js'
import { DAI, MICAH, repV2TokenAddress, TEST_ADDRESSES } from '../testsuite/simulator/utils/constants.js'
import { mintDAI, setupTestAccounts } from '../testsuite/simulator/utils/utilities.js'
import assert from 'node:assert'
import { deployRepCrowdsourcer, getRepCrowdSourcerAddress, isRepCrowdSourcerDeployed } from '../testsuite/simulator/utils/deployment.js'
import { approveErc20Token, getErc20TokenBalance, transferErc20Token } from '../testsuite/simulator/utils/erc20.js'
import { deposit, getBalance, getContractClosed, massWithdraw, micahCloseContract, micahWithdraw, recoverERC20, transfer, withdraw } from '../testsuite/simulator/utils/callsAndWrites.js'
import { addressString } from '../testsuite/simulator/utils/bigint.js'

describe('Contract Test Suite', () => {
	let mockWindow: MockWindowEthereum
	beforeEach(async () => {
		mockWindow = getMockedEthSimulateWindowEthereum()
		await setupTestAccounts(mockWindow)
	})

	test('Can Deploy Contract', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		await deployRepCrowdsourcer(client)
		const isDeployed = await isRepCrowdSourcerDeployed(client)
		assert.ok(isDeployed, 'Not Deployed!')
		assert.strictEqual(await getContractClosed(client), false)
	})

	test('Can Do Happy Path', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const micahClient = createWriteClient(mockWindow, MICAH, 0)

		await deployRepCrowdsourcer(client)
		const isDeployed = await isRepCrowdSourcerDeployed(client)
		assert.ok(isDeployed, 'Not Deployed!')
		const contract = getRepCrowdSourcerAddress()
		const plenty = 1000000000n * 10n ** 18n
		const ourAddress = addressString(TEST_ADDRESSES[0])
		const startingRep = await getErc20TokenBalance(client, repV2TokenAddress, ourAddress)

		// approve
		await approveErc20Token(client, repV2TokenAddress, contract, plenty)

		// deposit small amount
		const oneTimeDeposit = 1000n * 10n ** 18n
		assert.strictEqual(await getBalance(client, ourAddress), 0n, 'the contract has no balance for us')
		await deposit(client, oneTimeDeposit)
		assert.strictEqual(await getErc20TokenBalance(client, repV2TokenAddress, ourAddress), startingRep - oneTimeDeposit, 'we lost the rep')
		assert.strictEqual(await getErc20TokenBalance(client, repV2TokenAddress, contract), oneTimeDeposit, 'contract gained the rep')
		await assert.rejects(micahWithdraw(micahClient), 'Not enough balance!')

		// withdraw
		assert.strictEqual(await getBalance(client, ourAddress), oneTimeDeposit, 'the contract stored our balance')
		await withdraw(client)
		assert.strictEqual(await getBalance(client, ourAddress), 0n, 'the contract zeroed our balance')
		assert.strictEqual(await getErc20TokenBalance(client, repV2TokenAddress, contract), 0n, 'contract is empty after withdraw')
		assert.strictEqual(await getErc20TokenBalance(client, repV2TokenAddress, ourAddress), startingRep, 'we got rep back')

		// deposit enough to fill
		const enoughRepToTrigger = 210000n * 10n ** 18n
		await deposit(client, enoughRepToTrigger)
		assert.strictEqual(await getErc20TokenBalance(client, repV2TokenAddress, contract), enoughRepToTrigger, 'contract gained rep')
		await assert.rejects(micahWithdraw(client), 'Caller is not Micah!')

		await assert.rejects(massWithdraw(micahClient, [ourAddress]), 'Contract needs to be closed')

		// micah withdraw
		const micahAddressString = addressString(MICAH)
		const micahStartRep = await getErc20TokenBalance(client, repV2TokenAddress, micahAddressString)
		await micahWithdraw(micahClient)
		assert.strictEqual(await getErc20TokenBalance(client, repV2TokenAddress, contract), 0n, 'contract is empty')
		assert.strictEqual(await getErc20TokenBalance(client, repV2TokenAddress, micahAddressString), micahStartRep + enoughRepToTrigger, 'micah got the rep')

		// contract closed
		assert.strictEqual(await getContractClosed(client), true, 'contract is closed')
		await assert.rejects(deposit(client, oneTimeDeposit), 'Deposits are closed')
	})

	test('Can Do Closed Path', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const micahClient = createWriteClient(mockWindow, MICAH, 0)

		await deployRepCrowdsourcer(client)
		const isDeployed = await isRepCrowdSourcerDeployed(client)
		assert.ok(isDeployed, 'Not Deployed!')
		const contract = getRepCrowdSourcerAddress()
		const plenty = 1000000000n * 10n ** 18n
		const ourAddress = addressString(TEST_ADDRESSES[0])
		const startingRep = await getErc20TokenBalance(client, repV2TokenAddress, ourAddress)

		// approve
		await approveErc20Token(client, repV2TokenAddress, contract, plenty)

		// deposit small amount
		const oneTimeDeposit = 1000n * 10n ** 18n
		assert.strictEqual(await getBalance(client, ourAddress), 0n, 'the contract has no balance for us')
		await deposit(client, oneTimeDeposit)
		assert.strictEqual(await getErc20TokenBalance(client, repV2TokenAddress, ourAddress), startingRep - oneTimeDeposit, 'we lost the rep')
		assert.strictEqual(await getErc20TokenBalance(client, repV2TokenAddress, contract), oneTimeDeposit, 'contract gained the rep')
		await assert.rejects(micahWithdraw(micahClient), 'Not enough balance!')

		// micah withdraw
		await micahCloseContract(micahClient)
		assert.strictEqual(await getErc20TokenBalance(client, repV2TokenAddress, contract), oneTimeDeposit, 'contract still has the rep')

		// contract closed
		assert.strictEqual(await getContractClosed(client), true, 'contract is closed')
		await assert.rejects(deposit(client, oneTimeDeposit), 'Deposits are closed')

		// micah can mass withdraw
		await massWithdraw(micahClient, [ourAddress])
		assert.strictEqual(await getErc20TokenBalance(client, repV2TokenAddress, contract), 0n, 'contract is empty')
		assert.strictEqual(await getErc20TokenBalance(client, repV2TokenAddress, ourAddress), startingRep, 'we got the rep back')
	})

	test('Can recover ERC20', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const micahClient = createWriteClient(mockWindow, MICAH, 0)
		await deployRepCrowdsourcer(client)
		const contract = getRepCrowdSourcerAddress()
		const balance = 1000000n * 10n ** 18n
		const ourAddress = addressString(TEST_ADDRESSES[0])
		const micahAddress = addressString(MICAH)
		await mintDAI(mockWindow, [{ address: ourAddress, amount: balance }])
		assert.strictEqual(await getErc20TokenBalance(client, DAI, ourAddress), balance, 'DAI minting worked')

		const contractDaiBalance = await getErc20TokenBalance(client, DAI, contract)

		await transferErc20Token(client, DAI, contract, balance)
		assert.strictEqual(await getErc20TokenBalance(client, DAI, ourAddress), 0n, 'We sent all DAI')
		assert.strictEqual(await getErc20TokenBalance(client, DAI, contract), contractDaiBalance + balance, 'Contract has it all')

		await assert.rejects(recoverERC20(client, DAI, ourAddress), 'we cannot recover it')
		await transferErc20Token(client, repV2TokenAddress, contract, 100n)
		assert.strictEqual(await getErc20TokenBalance(client, repV2TokenAddress, contract), 100n, 'Contract has rep')
		await assert.rejects(recoverERC20(client, repV2TokenAddress, ourAddress), 'we cannot recover rep')

		const micahDaiBalance = await getErc20TokenBalance(client, DAI, micahAddress)
		await recoverERC20(micahClient, DAI, micahAddress)
		assert.strictEqual(await getErc20TokenBalance(client, DAI, contract), 0n, 'Contract is empty of dai')
		assert.strictEqual(await getErc20TokenBalance(client, DAI, micahAddress), micahDaiBalance + balance, 'Micah has the dai')
		await assert.rejects(recoverERC20(micahClient, repV2TokenAddress, micahAddress), 'Micah cannot recover rep')
	})

	test('Cannot send ETH to contract', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		await deployRepCrowdsourcer(client)
		const contract = getRepCrowdSourcerAddress()
		await assert.rejects(client.sendTransaction({ to: contract, value: 100n }))
	})

	test('Can ERC20 transfer balance in contract', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const client2 = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
		await deployRepCrowdsourcer(client)
		const contract = getRepCrowdSourcerAddress()
		const plenty = 1000000000n * 10n ** 18n
		const ourAddress = addressString(TEST_ADDRESSES[0])
		const startingRep = await getErc20TokenBalance(client, repV2TokenAddress, ourAddress)

		// approve
		await approveErc20Token(client, repV2TokenAddress, contract, plenty)

		// deposit small amount
		const oneTimeDeposit = 1000n * 10n ** 18n
		await deposit(client, oneTimeDeposit)
		assert.strictEqual(await getErc20TokenBalance(client, contract, client.account.address), oneTimeDeposit, 'client gained an ERC20 balance in the contract')

		// transfer small amount to other account
		await transfer(client, client2.account.address, oneTimeDeposit)
		assert.strictEqual(await getErc20TokenBalance(client, contract, client.account.address), 0n, 'client transfered and lost tokens')
		assert.strictEqual(await getErc20TokenBalance(client, contract, client2.account.address), oneTimeDeposit, 'client2 recieved the tokens')

		// withdraw from the recipient account
		await withdraw(client2)
		assert.strictEqual(await getBalance(client2, ourAddress), 0n, 'the contract zeroed our balance')
		assert.strictEqual(await getErc20TokenBalance(client2, repV2TokenAddress, contract), 0n, 'contract is empty after withdraw')
		assert.strictEqual(await getErc20TokenBalance(client2, repV2TokenAddress, client2.account.address), startingRep + oneTimeDeposit, 'we got rep back')
	})

	test('Can withdraw a Rep balance out of sync with standard deposits', async () => {
		const micahClient = createWriteClient(mockWindow, MICAH, 0)
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		const client2 = createWriteClient(mockWindow, TEST_ADDRESSES[1], 0)
		await deployRepCrowdsourcer(client)
		const contract = getRepCrowdSourcerAddress()
		const plenty = 1000000000n * 10n ** 18n
		const ourAddress = addressString(TEST_ADDRESSES[0])
		const startingRep = await getErc20TokenBalance(client, repV2TokenAddress, ourAddress)

		// approve
		await approveErc20Token(client, repV2TokenAddress, contract, plenty)
		await approveErc20Token(client2, repV2TokenAddress, contract, plenty)

		// deposit small amounts
		const clientDeposit = 1000n * 10n ** 18n
		const client2Deposit = clientDeposit * 2n
		await deposit(client, clientDeposit)
		await deposit(client2, client2Deposit)

		// Micah sends additional REP to contract
		await transferErc20Token(micahClient, repV2TokenAddress, contract, clientDeposit * 3n)

		// withdraw from the recipient accounts and get proportional balance
		await withdraw(client)
		assert.strictEqual(await getErc20TokenBalance(client, repV2TokenAddress, client.account.address), startingRep + clientDeposit, 'we got rep back plus the additional REP Micah added')

		await withdraw(client2)
		assert.strictEqual(await getErc20TokenBalance(client2, repV2TokenAddress, client2.account.address), startingRep + client2Deposit, 'we got rep back plus the additional REP Micah added')
	})
})
