pragma solidity ^0.4.17;

import "./Mortal.sol";

contract Remittance is Mortal {
  bytes32 private alicePasswordSha3;
  bytes32 private bobPasswordSha3;

  // 0 means no deadline
  // non-0 means the max block index at which this can be redeemed
  uint public deadline;

  uint constant public MAX_DEADLINE = 100;

  function Remittance(bytes32 _alicePasswordSha3, bytes32 _bobPasswordSha3, uint _deadline)
  public
  payable
  {
    require(msg.value > 0);
    require(keccak256("") != _alicePasswordSha3);
    require(keccak256("") != _bobPasswordSha3);
    require(_deadline <= MAX_DEADLINE);

    alicePasswordSha3 = _alicePasswordSha3;
    bobPasswordSha3 = _bobPasswordSha3;

    if (_deadline > 0) {
      deadline = block.number + _deadline;
    }
  }

  function redeem(string alicePassword, string bobPassword)
  public
  withinDeadline
  returns (bool success)
  {
    require(keccak256(alicePassword) == alicePasswordSha3);
    require(keccak256(bobPassword) == bobPasswordSha3);

    msg.sender.transfer(this.balance);
    selfdestruct(msg.sender);

    return true;
  }

  function refund()
  public
  pastDeadline
  onlyOwner
  returns (bool success)
  {
    getOwner().transfer(this.balance);
    selfdestruct(msg.sender);

    return true;
  }

  modifier withinDeadline {
    require(deadline == 0 || block.number <= deadline);
    _;
  }

  modifier pastDeadline {
    require(deadline > 0 && block.number > deadline);
    _;
  }
}
