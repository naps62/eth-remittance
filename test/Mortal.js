const Mortal = artifacts.require("./Mortal.sol");
const assertRevert = require('./helpers/assertRevert');
const assertEvent = require('./helpers/assertEvent');
const mineTx = require("./helpers/mineTx.js");

contract("Mortal", accounts => {
  const owner = accounts[0];
  const alice = accounts[1];
  let contract = null;

  beforeEach(async () => {
    contract = await Mortal.new({ from: owner });
  })

  it("can be closed by its owner", async () => {
    const tx= contract.kill({ from: owner });
    await mineTx(tx);

    const currentOwner = await contract.getOwner();

    assert.strictEqual(currentOwner, '0x0');
  });

  it("creates an event when closed", async () => {
    const tx = await contract.kill({ from: owner });

    assert.strictEqual(tx.logs[0].event, "Killed");
  });

  it("cannot be closed by anyone else", async () => {
    try {
      const tx = contract.kill({ from: alice })
      await mineTx(tx);
      assert.fail();
    } catch(err) {
      assertRevert(err)
    }
  });
});
