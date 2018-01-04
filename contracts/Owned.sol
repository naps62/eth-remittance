pragma solidity ^0.4.17;

contract Owned {
  address private owner;

  event OwnershipTransfered(address indexed oldOwner, address indexed newOwner);

  function Owned() public {
    owner = msg.sender;
  }

  modifier onlyOwner {
    require(msg.sender == owner);
    _;
  }

  function getOwner() public view returns (address) {
    return owner;
  }

  function transferOwnership(address newOwner) public onlyOwner {
    require(newOwner != address(0));

    OwnershipTransfered(owner, newOwner);
    owner = newOwner;
  }
}
