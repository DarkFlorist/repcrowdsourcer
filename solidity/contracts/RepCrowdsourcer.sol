// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.29;

interface IERC20 {
	function balanceOf(address account) external view returns (uint256);
	function transfer(address to, uint256 value) external returns (bool);
	function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract GoFundMicah {
	IERC20 public constant repV2 = IERC20(0x221657776846890989a759BA2973e427DfF5C9bB);
	address public constant micahAddress = 0xed1e06B49C53293A1321Dd47Abf8D50F9Be77E11; // GoFundMicah SAFE
	uint256 public constant minBalanceToWithdraw = 200000 ether;

	mapping(address => uint256) public deposits;
	bool public contractClosed = false;

	event Deposit(address indexed depositor, uint256 amount);
	event Withdraw(address indexed withdrawer, uint256 amount);
	event ContractClosed();
	event MicahWithdraw(uint256 amount);
	event TokenRecovered(address tokenAddress, address recipient, uint256 amount);

	function deposit(uint256 amount) public {
		require(!contractClosed, 'Deposits are closed');
		repV2.transferFrom(msg.sender, address(this), amount);
		deposits[msg.sender] += amount;
		emit Deposit(msg.sender, amount);
	}

	function internalWithdraw(address recipient) private {
		uint256 amount = deposits[recipient];
		deposits[recipient] = 0;
		repV2.transfer(recipient, amount);
		emit Withdraw(recipient, amount);
	}

	function withdraw() public {
		internalWithdraw(msg.sender);
	}

	function massWithdraw(address[] calldata recipients) public {
		require(contractClosed, 'Contract needs to be closed');
		for (uint256 i = 0; i < recipients.length; ++i) {
			internalWithdraw(recipients[i]);
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

	function recoverERC20(IERC20 token, address recipient) external {
		require(msg.sender == micahAddress, 'Caller is not Micah!');
		require(address(token) != address(repV2), 'Cannot recover REPv2 token');
		uint256 amount = token.balanceOf(address(this));
		token.transfer(recipient, amount);
		emit TokenRecovered(address(token), recipient, amount);
	}
}
