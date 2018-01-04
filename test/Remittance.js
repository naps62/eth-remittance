const Remittance = artifacts.require("./Remittance.sol");
const assertRevert = require('./helpers/assertRevert');
const P = require("bluebird");

const getBalance = P.promisify(web3.eth.getBalance);
const sendTransaction = P.promisify(web3.eth.sendTransaction);

contract("Remittance", accounts => {
  const alice = accounts[0];
  const carol = accounts[1];
  const alicePassword = "password1";
  const bobPassword = "password2";
  const aliceHash = web3.sha3(alicePassword);
  const bobHash = web3.sha3(bobPassword);
  const value = web3.toWei(0.01, "ether");
  let contract = null;

  beforeEach(async () => {
    contract = await Remittance.new(
      aliceHash,
      bobHash,
      1,
      { from: alice, value: value }
    );
  })

  it("can't create a contract without ether", async () => {
    try {
      await Remittance.new(
        aliceHash,
        bobHash,
        1,
        { from: alice, value: 0 }
      );
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("can't create a contract with empty password hashes", async() => {
    try {
      await Remittance.new(
        web3.sha3(""),
        bobHash,
        1,
        { from: alice, value: 1 }
      );
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("can't create a contract with too big a deadline", async() => {
    try {
      await Remittance.new(
        aliceHash,
        bobHash,
        1000,
        { from: alice, value: 1 }
      );
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("can be redemeed with correct passwords", async () => {
    const initial = await getBalance(carol);
    await contract.redeem(alicePassword, bobPassword, { from: carol });
    const final = await getBalance(carol);

    assert(final.greaterThan(initial));
  });

  it("kills the contract after redeeming", async () => {
    await contract.redeem(alicePassword, bobPassword, { from: carol });
    const currentOwner = await contract.getOwner();

    assert.equal(currentOwner, 0);
  });

  it("cannot be redeemed with incorrect passwords", async () => {
    try {
      await contract.redeem("invalid", bobPassword, { from: carol });
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("can't be redeemed if deadline has passed", async() => {
    const contract = await Remittance.new(
      aliceHash,
      bobHash,
      1,
      { from: alice, value: 1 }
    );

    // force creation of a new block, to expire the deadline
    await sendTransaction({ from: accounts[1], to: accounts[0], value: 1 })

    try {
      const tx = await contract.redeem(alicePassword, bobPassword, { from: carol });
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("can be refunded by the owner if deadline has passed", async() => {
    const contract = await Remittance.new(
      aliceHash,
      bobHash,
      1,
      { from: alice, value: value }
    );

    // force creation of a new block, to expire the deadline
    await sendTransaction({ from: accounts[1], to: accounts[0], value: 1 })

    const initial = await getBalance(alice);
    await contract.refund({ from: alice });
    const final = await getBalance(alice);

    assert(final.greaterThan(initial));
  })

  it("cannot by refunded by a non-owner", async() => {
    const contract = await Remittance.new(
      aliceHash,
      bobHash,
      1,
      { from: alice, value: value }
    );

    // force creation of a new block, to expire the deadline
    await sendTransaction({ from: accounts[1], to: accounts[0], value: 1 })

    try {
      await contract.refund({ from: carol });
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("kills the contract after redeeming", async () => {
    const contract = await Remittance.new(
      aliceHash,
      bobHash,
      1,
      { from: alice, value: value }
    );

    // force creation of a new block, to expire the deadline
    await sendTransaction({ from: accounts[1], to: accounts[0], value: 1 })

    await contract.refund({ from: alice });
    const currentOwner = await contract.getOwner();

    assert.equal(currentOwner, 0);
  });
});
