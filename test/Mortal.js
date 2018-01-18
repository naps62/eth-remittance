const Mortal = artifacts.require("./Mortal.sol");
const P = require("bluebird");

const assertRevert = require('./helpers/assertRevert');
const assertEvent = require('./helpers/assertEvent');
const mineTx = require("./helpers/mineTx.js");

const getCode = P.promisify(web3.eth.getCode);
const getStorageAt = P.promisify(web3.eth.getStorageAt);

contract("Mortal", accounts => {
  const owner = accounts[0];
  const alice = accounts[1];
  let mortal = null;

  beforeEach("deploy Mortal", async () => {
    mortal = await Mortal.new({ from: owner });
  })

  it("can be closed by its owner", async () => {
    const tx= mortal.kill({ from: owner });
    await mineTx(tx);

    assert.strictEqual(await mortal.getOwner(), '0x0');
    assert.strictEqual(await getCode(mortal.address), '0x0');
    assert.strictEqual(await getStorageAt(mortal.address, 0), '0x00');
  });

  it("creates an event when closed", async () => {
    const tx = await mortal.kill({ from: owner });

    assert.strictEqual(tx.logs[0].event, "Killed");
  });

  it("cannot be closed by anyone else", async () => {
    try {
      const tx = mortal.kill({ from: alice })
      await mineTx(tx);
      assert.fail();
    } catch(err) {
      assertRevert(err)
    }
  });
});
