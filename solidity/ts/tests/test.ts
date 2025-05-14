import { describe, beforeEach, test } from 'node:test'
import { getMockedEthSimulateWindowEthereum, MockWindowEthereum } from '../testsuite/simulator/MockWindowEthereum.js'
import { createWriteClient } from '../testsuite/simulator/utils/viem.js'
import { MICAH, repV2TokenAddress, TEST_ADDRESSES } from '../testsuite/simulator/utils/constants.js'
import { setupTestAccounts } from '../testsuite/simulator/utils/utilities.js'
import assert from 'node:assert'
import { deployRepCrowdsourcer, getRepCrowdSourcerAddress, isRepCrowdSourcerDeployed } from '../testsuite/simulator/utils/deployment.js'
import { approveErc20Token, getErc20TokenBalance } from '../testsuite/simulator/utils/erc20.js'
import { deposit, getBalance, getContractClosed, massWithdraw, micahCloseContract, micahWithdraw, withdraw } from '../testsuite/simulator/utils/callsAndWrites.js'
import { addressString } from '../testsuite/simulator/utils/bigint.js'

describe('Contract Test Suite', () => {
	let mockWindow: MockWindowEthereum
	beforeEach(async () => {
		mockWindow = getMockedEthSimulateWindowEthereum()
		await setupTestAccounts(mockWindow)
	})
/*
	test('canDeployContract', async () => {
		const client = createWriteClient(mockWindow, TEST_ADDRESSES[0], 0)
		await deployRepCrowdsourcer(client)
		const isDeployed = await isRepCrowdSourcerDeployed(client)
		assert.ok(isDeployed, 'Not Deployed!')
		assert.strictEqual(await getContractClosed(client), false)
	})
*/
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
		await withdraw(client, oneTimeDeposit)
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
})
