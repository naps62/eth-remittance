const Owned = artifacts.require("./Owned.sol");
const { assertRevert } = require('./helpers/utils');

contract("Owned", accounts => {
  const owner = accounts[0];
  const alice = accounts[1];
  let contract = null;

  beforeEach(() => {
    return Owned.new({ from: owner })
      .then(_instance => contract = _instance);
  })

  it("can change ownership", async () => {
    const result = await contract.transferOwnership(alice, { from: owner })

    assert.strictEqual(await contract.getOwner(), alice);
    assert.strictEqual(result.logs[0].event, "OwnershipTransfered");
  });

  it("emits an event when changing ownership", async () => {
    const result = await contract.transferOwnership(alice, { from: owner })

    assert.strictEqual(result.logs[0].event, "OwnershipTransfered");
    assert.strictEqual(result.logs[0].args.oldOwner, owner);
    assert.strictEqual(result.logs[0].args.newOwner, alice);
  });

  it("does not allow alice to make herself the owner", async () => {
    await assertRevert(async () => (
      await contract.transferOwnership(alice, { from: alice })
    ))
  })
});
