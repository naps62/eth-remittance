const Remittance = artifacts.require("./Remittance.sol");
const assertRevert = require('./helpers/assertRevert');
const assertEvent = require('./helpers/assertEvent');
const P = require("bluebird");
const mineTx = require("./helpers/mineTx.js");
const txPrice = require("./helpers/txPrice");

const getBalance = P.promisify(web3.eth.getBalance);
const sendTransaction = P.promisify(web3.eth.sendTransaction);

const currentBlock = () => web3.eth.blockNumber;

contract("Remittance", accounts => {
  const alice = accounts[0];
  const carol = accounts[1];
  const otherAccount = accounts[2];
  const alicePassword = "password1";
  const bobPassword = "password2";
  const password = alicePassword + bobPassword;
  const value = web3.toWei(1, "ether");
  let hash = null;
  let remittance = null;
  let tx = null;

  const encryptPasswords = async (p1, p2) => tx = remittance.getHash(p1, p2);

  beforeEach("deploy Remittance", async () => {
    remittance = await Remittance.new({ from: alice });
    hash = await encryptPasswords(alicePassword, bobPassword);
  });


  it("can't make a deposit without ether", async () => {
    try {
      tx = remittance.deposit(
        carol,
        hash,
        currentBlock() + 1,
        { from: alice }
      )
      await mineTx(tx);
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("can't make a deposit using hashes from empty passwords", async() => {
    try {
      tx = remittance.deposit(
        carol,
        await encryptPasswords("", ""),
        currentBlock() + 1,
        { from: alice, value: 1 }
      );
      await mineTx(tx);
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("can't make a deposit with too big a deadline", async() => {
    try {
      tx = remittance.deposit(
        carol,
        hash,
        currentBlock() + 1000,
        { from: alice, value: 1 }
      );
      await mineTx(tx);
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("can be redemeed with correct passwords", async () => {
    tx = remittance.deposit(
      carol,
      hash,
      currentBlock() + 10,
      { from: alice, value: value }
    );
    await mineTx(tx);

    const initial = await getBalance(carol);
    tx = remittance.redeem(alicePassword, bobPassword, { from: carol });
    await mineTx(tx);
    const final = await getBalance(carol);

    assert(final.greaterThan(initial));
  });

  it("cannot be redeemed by someone other than the recipient, even with the passwords", async () => {
    tx = remittance.deposit(
      carol,
      hash,
      currentBlock() + 10,
      { from: alice, value: value }
    );
    await mineTx(tx);

    try {
      tx = remittance.redeem(alicePassword, bobPassword, { from: otherAccount });
      await mineTx(tx);
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("cannot be redeemed with incorrect passwords", async () => {
    try {
      tx = remittance.deposit(
        carol,
        hash,
        currentBlock() + 10,
        { from: alice, value: value }
      );
      await mineTx(tx);

      tx = remittance.redeem("invalid", "bobPassword", { from: carol });
      await mineTx(tx);
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("can't be redeemed if deadline has passed", async() => {
    tx = remittance.deposit(
      carol,
      hash,
      currentBlock() + 1,
      { from: alice, value: value }
    );
  await mineTx(tx);

    // force creation of a new block, to expire the deadline
    tx = sendTransaction({ from: accounts[1], to: accounts[0], value: 1 })
    await mineTx(tx);

    try {
      tx = remittance.redeem(
        alicePassword,
        bobPassword,
        { from: carol }
      );
      await mineTx(tx);
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("can be refunded by the owner if deadline has passed", async() => {
    const depositTx = await remittance.deposit(
      carol,
      hash,
      currentBlock() + 1,
      { from: alice, value: value }
    );
    await mineTx(depositTx);

    // force creation of a new block, to expire the deadline
    tx = sendTransaction({ from: accounts[1], to: accounts[0], value: 1 })
    await mineTx(tx);

    const initial = await getBalance(alice);
    const refundTx = await remittance.refund(alicePassword, bobPassword, { from: alice });
    await mineTx(refundTx);
    const final = await getBalance(alice);
    const price = txPrice(refundTx);

    const expected = initial.
      plus(depositTx.logs[0].args.value).
      minus(price);

    assert(final.equals(expected));
  });

  it("can be refunded by the owner if there is no deadline", async() => {
    depositTx = await remittance.deposit(
      carol,
      hash,
      0,
      { from: alice, value: value }
    );
    await mineTx(depositTx);

    const initial = await getBalance(alice);
    refundTx = await remittance.refund(alicePassword, bobPassword, { from: alice });
    await mineTx(refundTx);
    const final = await getBalance(alice);
    const price = txPrice(refundTx);

    const expected = initial.
      plus(depositTx.logs[0].args.value).
      minus(price)

    assert(final.equals(expected));
  });

  it("cannot be refunded by a non-owner", async() => {
    tx = remittance.deposit(
      carol,
      hash,
      currentBlock() + 10,
      { from: alice, value: value }
    );
    await mineTx(tx);

    // force creation of a new block, to expire the deadline
    tx = sendTransaction({ from: accounts[1], to: accounts[0], value: 1 })
    await mineTx(tx);

    try {
      tx = remittance.refund(alicePassword, bobPassword, { from: carol });
      await mineTx(tx);
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("takes a small fee", async () => {
    tx = await remittance.deposit(
      carol,
      hash,
      currentBlock() + 10,
      { from: alice, value: value }
    );
    const result = await mineTx(tx);

    // const txFees = txPrice(result.transactionHash);
    const fees = await remittance.totalFees();

    console.log(fees)
    assert(fees.greaterThan(0));
    assert(fees.equals(tx.logs[0].args.fees));
    // assert(txFees.greaterThan(fees));
  });

  it("allows the owner to redeem the fees", async () => {
    tx = remittance.deposit(
      carol,
      hash,
      currentBlock() + 10,
      { from: alice, value: value }
    );
    await mineTx(tx);

    // fees for a single deposit are too low to actually assert that
    // the transaction gave alice a profit
    // because the redemption itself costs more
    assert.ok(await remittance.redeemFees({ from: alice }));
  });

  it("logs an event when a deposit is made", async () => {
    tx = remittance.deposit(
      carol,
      hash,
      currentBlock() + 1,
      { from: alice, value: value }
    );
    await mineTx(tx);

    assertEvent(remittance, { event: "LogDeposit", args: { recipient: carol, owner: alice } });
  });

  it("logs an event when a redeem is made", async () => {
    tx = remittance.deposit(
      carol,
      hash,
      currentBlock() + 10,
      { from: alice, value: value }
    );
    await mineTx(tx);

    tx = remittance.redeem(alicePassword, bobPassword, { from: carol })
    await mineTx(tx);

    assertEvent(remittance, { event: "LogRedeem", args: { recipient: carol, owner: alice } });
  });

  it("logs an event when a refund is made", async () => {
    tx = remittance.deposit(
      carol,
      hash,
      0,
      { from: alice, value: value }
    );
    await mineTx(tx);

    tx = remittance.refund(alicePassword, bobPassword, { from: alice })
    await mineTx(tx);

    assertEvent(remittance, { event: "LogRefund", args: { recipient: carol, owner: alice } });
  });

  it("prevents password re-use", async () => {
    tx = remittance.deposit(
      carol,
      hash,
      0,
      { from: alice, value: value }
    );
    await mineTx(tx);

    try {
      tx = remittance.deposit(
        alice,
        hash,
        0,
        { from: carol, value: value }
      );
      await mineTx(tx);
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  })
});
