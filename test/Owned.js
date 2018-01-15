const Owned = artifacts.require("./Owned.sol");
const assertRevert = require('./helpers/assertRevert');
const mineTx = require("./helpers/mineTx.js");

contract("Owned", accounts => {
  const owner = accounts[0];
  const alice = accounts[1];
  let contract = null;
  let tx = null;

  beforeEach(async () => {
    contract = await Owned.new({ from: owner });
  })

  it("can change ownership", async () => {
    const tx = await contract.transferOwnership(alice, { from: owner })

    assert.strictEqual(await contract.getOwner(), alice);
    assert.strictEqual(tx.logs[0].event, "OwnershipTransfered");
  });

  it("emits an event when changing ownership", async () => {
    const tx = await contract.transferOwnership(alice, { from: owner })

    assert.strictEqual(tx.logs[0].event, "OwnershipTransfered");
    assert.strictEqual(tx.logs[0].args.oldOwner, owner);
    assert.strictEqual(tx.logs[0].args.newOwner, alice);
  });

  it("does not allow alice to make herself the owner", async () => {
    try {
      tx = contract.transferOwnership(alice, { from: alice })
      await mineTx(tx);
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });
});
