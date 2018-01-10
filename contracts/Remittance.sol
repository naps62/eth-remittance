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
    uint fee;
    // 0 means no deadline
    // non-0 means the max block index at which this can be redeemed
    uint deadline;
    bool withdrawn;
  }

  mapping(bytes32 => Escrow) public escrows;

  event LogDeposit(address indexed owner, address indexed recipient, uint value);
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

    // is this the proper way to ensure this?
    require(escrows[passwordSha3].owner == address(0));

    Escrow memory escrow;
    escrow.owner = msg.sender;
    escrow.recipient = recipient;
    escrow.deadline = deadline;

    uint fees = (initialGas - msg.gas) * tx.gasprice;
    escrow.value = msg.value - fees;
    totalFees += fees;

    escrows[passwordSha3] = escrow;

    LogDeposit(escrow.owner, escrow.recipient, msg.value);

    return true;
  }

  function redeem(string password1, string password2)
  public
  returns (bool success)
  {
    Escrow memory escrow = findValidEscrow(password1, password2);
    require(escrow.recipient == msg.sender);
    ensureWithinDeadline(escrow);

    escrow.withdrawn = true;
    escrow.recipient.transfer(escrow.value);

    LogRedeem(escrow.owner, escrow.recipient, escrow.value);

    return true;
  }

  function refund(string password1, string password2)
  public
  returns (bool success)
  {
    Escrow memory escrow = findValidEscrow(password1, password2);
    require(escrow.owner == msg.sender);
    ensurePastDeadline(escrow);

    escrow.withdrawn = true;
    escrow.owner.transfer(escrow.value);

    LogRefund(escrow.owner, escrow.recipient, escrow.value);

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

  function findValidEscrow(string password1, string password2)
  private
  view
  returns (Escrow) {
    bytes32 hash = this.getHash(password1, password2);
    Escrow memory escrow = escrows[hash];
    require(escrow.recipient != address(0));
    require(!escrow.withdrawn);

    return escrow;
  }

  function ensureWithinDeadline(Escrow escrow)
  private
  view
  {
    require(escrow.deadline == 0 || block.number <= escrow.deadline);
  }

  function ensurePastDeadline(Escrow escrow)
  private
  view
  {
    require(escrow.deadline == 0 || block.number > escrow.deadline);
  }

  function getHash(string p1, string p2)
  external
  pure
  returns (bytes32)
  {
    return keccak256(p1, p2);
  }
}
