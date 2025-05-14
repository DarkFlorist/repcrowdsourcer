// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.29;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract RepCrowdsourcer {
	IERC20 public repV2 = IERC20(0x221657776846890989a759BA2973e427DfF5C9bB);
	address public micahAddress = 0x82c34Fdbc5c71B899F484e716BAD2271e2c6f0C3; // micah.darkflorist.eth VERIFY!
	uint256 public minBalanceToWithdraw = 200000 ether;

	mapping(address => uint256) public deposits;
	bool public contractClosed;

	event Deposit(address indexed depositor, uint256 amount);
	event Withdraw(address indexed withdrawer, uint256 amount);
	event ContractClosed();
	event MicahWithdraw(uint256 amount);

	bool internal locked;

	modifier noReentrant() {
		require(!locked, 'No re-entrancy');
		locked = true;
		_;
		locked = false;
	}

	function deposit(uint256 amount) public noReentrant {
		require(!contractClosed, 'Deposits are closed');
		repV2.transferFrom(msg.sender, address(this), amount);
		deposits[msg.sender] += amount;
		emit Deposit(msg.sender, amount);
	}

	function withdraw(uint256 amount) public noReentrant {
		require(deposits[msg.sender] >= amount, 'not enough balance to withdraw');
		deposits[msg.sender] -= amount;
		repV2.transfer(msg.sender, amount);
		emit Withdraw(msg.sender, amount);
	}

	function massWithdraw(address[] calldata recipients) public noReentrant {
		require(contractClosed, 'Contract needs to be closed');
		for (uint256 i = 0; i < recipients.length; ++i) {
			uint256 amount = deposits[recipients[i]];
			deposits[recipients[i]] = 0;
			repV2.transfer(recipients[i], amount);
			emit Withdraw(recipients[i], amount);
		}
	}

	function micahCloseContract() public {
		require(msg.sender == micahAddress, 'Caller is not Micah!');
		contractClosed = true;
		emit ContractClosed();
	}

	function micahWithdraw() public {
		require(msg.sender == micahAddress, 'Caller is not Micah!');
		uint256 balance = repV2.balanceOf(address(this));
		require(balance >= minBalanceToWithdraw, 'Not enough balance');
		repV2.transfer(micahAddress, balance);
		emit MicahWithdraw(balance);
		contractClosed = true;
		emit ContractClosed();
	}
}
