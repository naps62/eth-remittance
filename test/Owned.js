const Owned = artifacts.require("./Owned.sol");
const assertRevert = require('./helpers/assertRevert');
const assertEvent = require('./helpers/assertEvent');

contract("Owned", accounts => {
  const owner = accounts[0];
  const alice = accounts[1];
  let contract = null;

  beforeEach(() => {
    return Owned.new()
      .then(_instance => contract = _instance);
  })

  it("can change ownership", async () => {
    const result = await contract.transferOwnership(alice, { from: owner })

    assert.equal(await contract.getOwner(), alice);
    assert.equal(result.logs[0].event, "OwnershipTransfered");
  });

  it("emits an event when changing ownership", async () => {
    const result = await contract.transferOwnership(alice, { from: owner })

    assert.equal(result.logs[0].event, "OwnershipTransfered");
    assert.equal(result.logs[0].args.oldOwner, owner);
    assert.equal(result.logs[0].args.newOwner, alice);
  });
});
