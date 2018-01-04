const Mortal = artifacts.require("./Mortal.sol");
const assertRevert = require('./helpers/assertRevert');
const assertEvent = require('./helpers/assertEvent');

contract("Mortal", accounts => {
  const owner = accounts[0];
  const alice = accounts[1];
  let contract = null;

  beforeEach(() => {
    return Mortal.new()
      .then(_instance => contract = _instance);
  })

  it("can be closed by its owner", async () => {
    await contract.kill({ from: owner });
    const currentOwner = await contract.getOwner();

    assert.equal(currentOwner, 0);
  });

  it("creates an event when closed", async () => {
    const watcher = contract.Killed();

    const result = await contract.kill({ from: owner });

    assert.equal(result.logs[0].event, "Killed");
  });

  it("cannot be closed by anyone else", async () => {
    try {
      await contract.kill({ from: alice })
      assert.fail();
    } catch(err) {
      assertRevert(err)
    }
  });
});
