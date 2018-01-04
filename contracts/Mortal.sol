pragma solidity ^0.4.17;

import "./Owned.sol";

contract Mortal is Owned {
  event Killed;

  function kill() public onlyOwner {
    Killed();
    selfdestruct(getOwner());
  }
}
