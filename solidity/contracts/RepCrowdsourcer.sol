// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import './ERC20.sol';

contract GoFundMicah is ERC20('GoFundMicah', 'GFM') {
	IERC20 public constant repV2 = IERC20(0x221657776846890989a759BA2973e427DfF5C9bB);
	address public constant micahAddress = 0xed1e06B49C53293A1321Dd47Abf8D50F9Be77E11; // GoFundMicah SAFE
	uint256 public constant minBalanceToWithdraw = 200000 ether;

	bool public contractClosed = false;
	bool public withdrawsEnabled = true;

	event Deposit(address indexed depositor, uint256 amount);
	event Withdraw(address indexed withdrawer, uint256 amount);
	event ContractClosed();
	event WithdrawsEnabled(bool enabled);
	event MicahWithdraw(uint256 amount);
	event TokenRecovered(IERC20 tokenAddress, address recipient, uint256 amount);

	function deposit(uint256 amount) public {
		require(!contractClosed, 'Deposits are closed');
		repV2.transferFrom(msg.sender, address(this), amount);
		_mint(msg.sender, amount);
		emit Deposit(msg.sender, amount);
	}

	function internalWithdraw(address recipient) private {
		require(withdrawsEnabled, 'Withdraws disabled');
		uint256 amount = _balances[recipient];
		uint256 proportionalBalance = repV2.balanceOf(address(this)) * amount / totalSupply();
		_burn(recipient, amount);
		repV2.transfer(recipient, proportionalBalance);
		emit Withdraw(recipient, proportionalBalance);
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
		withdrawsEnabled = false;
		emit WithdrawsEnabled(false);
		emit ContractClosed();
	}

	function setWithdrawsEnabled() public {
		require(msg.sender == micahAddress, 'Caller is not Micah');
		withdrawsEnabled = true;
		emit WithdrawsEnabled(true);
	}

	function recoverERC20(IERC20 token, address recipient) external {
		require(msg.sender == micahAddress, 'Caller is not Micah!');
		require(token != repV2, 'Cannot recover REPv2 token');
		uint256 amount = token.balanceOf(address(this));
		token.transfer(recipient, amount);
		emit TokenRecovered(token, recipient, amount);
	}
}
