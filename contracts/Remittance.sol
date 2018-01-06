pragma solidity ^0.4.17;

import "./Mortal.sol";

contract Remittance is Mortal {
  bytes32 private alicePasswordSha3;
  bytes32 private bobPasswordSha3;

  uint constant public MAX_DEADLINE = 100;
  uint public totalFees;

  struct Wallet {
    address owner;
    address recipient;
    uint value;
    uint fee;
    // 0 means no deadline
    // non-0 means the max block index at which this can be redeemed
    uint deadline;
  }

  mapping(bytes32 => mapping(bytes32 => Wallet)) public wallets;

  function deposit(address recipient, bytes32 password1Sha3, bytes32 password2Sha3, uint deadline)
  public
  payable
  {
    uint initialGas = msg.gas;

    require(msg.value > 0);
    require(keccak256("") != password1Sha3);
    require(keccak256("") != password2Sha3);
    require(deadline <= MAX_DEADLINE);

    Wallet memory wallet;
    wallet.owner = msg.sender;
    wallet.recipient = recipient;

    if (deadline > 0) {
      wallet.deadline = block.number + deadline;
    }

    uint fees = (initialGas - msg.gas) * tx.gasprice;
    wallet.value = msg.value - wallet.fee;
    totalFees += fees;

    wallets[password1Sha3][password2Sha3] = wallet;
  }

  function redeem(string password1, string password2)
  public
  returns (bool success)
  {
    Wallet memory wallet = wallets[keccak256(password1)][keccak256(password2)];
    // is there a better way of checking the wallet exists?
    require(wallet.recipient == msg.sender);
    ensureWithinDeadline(wallet);

    wallet.recipient.transfer(wallet.value);

    return true;
  }

  function redeemFees()
  public
  onlyOwner
  returns (bool success)
  {
    require(totalFees > 0);

    msg.sender.transfer(totalFees);
    totalFees = 0;

    return true;
  }

  function refund(string password1, string password2)
  public
  returns (bool success)
  {
    Wallet memory wallet = wallets[keccak256(password1)][keccak256(password2)];
    // is there a better way of checking the wallet exists?
    require(wallet.owner != address(0));
    require(msg.sender == wallet.owner);
    ensurePastDeadline(wallet);

    wallet.owner.transfer(wallet.value);

    return true;
  }

  function ensureWithinDeadline(Wallet wallet)
  private
  view
  {
    require(wallet.deadline == 0 || block.number <= wallet.deadline);
  }

  function ensurePastDeadline(Wallet wallet)
  private
  view
  {
    require(wallet.deadline > 0 && block.number > wallet.deadline);
  }
}
