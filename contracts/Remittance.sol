pragma solidity ^0.4.17;

import "./Mortal.sol";

contract Remittance is Mortal {
  bytes32 private alicePasswordSha3;
  bytes32 private bobPasswordSha3;

  uint constant public MAX_DEADLINE = 100;
  uint public totalFees;

  struct Escrow {
    address owner;
    address recipient;
    uint value;
    // 0 means no deadline
    // non-0 means the max block index at which this can be redeemed
    uint deadline;
  }

  mapping(bytes32 => Escrow) public escrows;

  event LogDeposit(address indexed owner, address indexed recipient, uint value, uint fees);
  event LogRedeem(address indexed owner, address indexed recipient, uint value);
  event LogRefund(address indexed owner, address indexed recipient, uint value);

  function deposit(address recipient, bytes32 passwordSha3, uint deadline)
  public
  payable
  returns (bool success)
  {
    uint initialGas = msg.gas;

    require(msg.value > 0);
    require(keccak256("") != passwordSha3);
    require(deadline <= block.number + MAX_DEADLINE);

    require(escrows[passwordSha3].owner == address(0));

    Escrow storage escrow = escrows[passwordSha3];
    escrow.owner = msg.sender;
    escrow.recipient = recipient;
    escrow.deadline = deadline;

    uint fees = min((initialGas - msg.gas) * tx.gasprice, msg.value / 2);
    escrow.value = msg.value - fees;
    totalFees += fees;

    LogDeposit(escrow.owner, escrow.recipient, escrow.value, fees);

    return true;
  }

  function min(uint val1, uint val2)
  private
  pure
  returns (uint)
  {
    if (val1 > val2) {
      return val1;
    } else {
      return val2;
    }
  }

  function redeem(string password1, string password2)
  public
  returns (bool success)
  {
    Escrow storage escrow = findValidEscrow(password1, password2);
    require(escrow.recipient == msg.sender);
    ensureWithinDeadline(escrow);

    uint value = escrow.value;
    escrow.value = 0;
    escrow.recipient.transfer(value);

    LogRedeem(escrow.owner, escrow.recipient, value);

    return true;
  }

  function refund(string password1, string password2)
  public
  returns (bool success)
  {
    Escrow storage escrow = findValidEscrow(password1, password2);
    require(escrow.owner == msg.sender);
    ensurePastDeadline(escrow);

    uint value = escrow.value;
    escrow.value = 0;
    escrow.owner.transfer(value);

    LogRefund(escrow.owner, escrow.recipient, value);

    return true;
  }

  function redeemFees()
  public
  onlyOwner
  returns (bool success)
  {
    require(totalFees > 0);

    totalFees = 0;
    msg.sender.transfer(totalFees);

    return true;
  }

  function findValidEscrow(string password1, string password2)
  private
  view
  returns (Escrow storage escrow) {
    bytes32 hash = getHash(password1, password2);
    escrow = escrows[hash];
    require(escrow.recipient != address(0));
    require(escrow.value > 0);

    return escrow;
  }

  function ensureWithinDeadline(Escrow storage escrow)
  private
  view
  {
    require(escrow.deadline == 0 || block.number <= escrow.deadline);
  }

  function ensurePastDeadline(Escrow storage escrow)
  private
  view
  {
    require(escrow.deadline == 0 || block.number > escrow.deadline);
  }

  function getHash(string p1, string p2)
  public
  pure
  returns (bytes32)
  {
    return keccak256(p1, p2);
  }
}
