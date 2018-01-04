pragma solidity ^0.4.17;

import "./Mortal.sol";

contract Remittance is Mortal {
  bytes32 private alicePasswordSha3;
  bytes32 private bobPasswordSha3;


  uint constant public MAX_DEADLINE = 100;

  struct Wallet {
    address owner;
    uint value;
    // 0 means no deadline
    // non-0 means the max block index at which this can be redeemed
    uint deadline;
  }

  mapping(bytes32 => mapping(bytes32 => Wallet)) public wallets;

  function deposit(bytes32 password1Sha3, bytes32 password2Sha3, uint deadline)
  public
  payable
  {
    require(msg.value > 0);
    require(keccak256("") != password1Sha3);
    require(keccak256("") != password2Sha3);
    require(deadline <= MAX_DEADLINE);

    Wallet memory wallet;
    wallet.owner = msg.sender;
    wallet.amount = msg.value;

    if (deadline > 0) {
      wallet.deadline = block.number + deadline;
    }

    wallets[password1Sha3][password2Sha3] = wallet;
  }

  function redeem(string password1, string password2)
  public
  withinDeadline
  returns (bool success)
  {
    wallet = wallets[keccak256(password1)][keccak256(password2)];

    msg.sender.transfer(wallet.value);

    return true;
  }

  // function refund()
  // public
  // pastDeadline
  // onlyOwner
  // returns (bool success)
  // {
  //   getOwner().transfer(this.balance);
  //   selfdestruct(msg.sender);

  //   return true;
  // }

  // modifier withinDeadline {
  //   require(deadline == 0 || block.number <= deadline);
  //   _;
  // }

  // modifier pastDeadline {
  //   require(deadline > 0 && block.number > deadline);
  //   _;
  // }
}
