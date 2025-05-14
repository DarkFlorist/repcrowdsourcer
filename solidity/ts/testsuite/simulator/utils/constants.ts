export const repV2TokenAddress = '0x221657776846890989a759BA2973e427DfF5C9bB'

export const MOCK_ADDRESS = 0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefn
export const PROXY_DEPLOYER_ADDRESS = 0x4e59b44847b379578588920ca78fbf26c0b4956cn
export const VITALIK = 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045n

export const MICAH = 0x82c34Fdbc5c71B899F484e716BAD2271e2c6f0C3n
// Testing
export const TEST_ADDRESSES = [
	0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266n,
	0x70997970C51812dc3A010C7d01b50e0d17dc79C8n,
	0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BCn,
	0x90F79bf6EB2c4f870365E785982E1f101E93b906n,
	0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65n,
	0x9965507D1a55bcC2695C58ba16FB37d819B0A4dcn,
	0x976EA7n,
	MICAH,
]

export const MAX_BLOCK_CACHE = 5
export const TIME_BETWEEN_BLOCKS = 12
export const GAS_PER_BLOB = 2n**17n

export const CANNOT_SIMULATE_OFF_LEGACY_BLOCK = 'Cannot simulate off a legacy block'

export const METAMASK_ERROR_ALREADY_PENDING = { error: { code: -32002, message: 'Access request pending already.' } }
export const ERROR_INTERCEPTOR_NO_ACTIVE_ADDRESS = { error: { code: 2, message: 'Interceptor: No active address' } }
export const METAMASK_ERROR_NOT_CONNECTED_TO_CHAIN = { error: { code: 4900, message: 'Interceptor: Not connected to chain' } }
export const ERROR_INTERCEPTOR_GET_CODE_FAILED = { error: { code: -40001, message: 'Interceptor: Get code failed' } } // I wonder how we should come up with these numbers?
export const ERROR_INTERCEPTOR_GAS_ESTIMATION_FAILED = -40002

export const DEFAULT_CALL_ADDRESS = 0x1n

export const ETHEREUM_EIP1559_ELASTICITY_MULTIPLIER = 4n // Bounds the maximum gas limit an EIP-1559 block may have, Ethereum = 4, Polygon = 8, lets just default to 4
export const ETHEREUM_EIP1559_BASEFEECHANGEDENOMINATOR = 8n // Bounds the amount the base fee can change between blocks.

export const NEW_BLOCK_ABORT = 'New Block Abort'
