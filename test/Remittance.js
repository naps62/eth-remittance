const Remittance = artifacts.require("./Remittance.sol");
const assertRevert = require('./helpers/assertRevert');
const assertEvent = require('./helpers/assertEvent');
const P = require("bluebird");
const mine = require("./helpers/mine.js");

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
  const value = web3.toWei(0.01, "ether");
  let hash = null;
  let contract = null;

  const encryptPasswords = async (p1, p2) => await contract.getHash(p1, p2);

  beforeEach(async () => {
    contract = await Remittance.new({ from: alice });
    hash = await encryptPasswords(alicePassword, bobPassword);
  });


  it("can't make a deposit without ether", async () => {
    try {
      await contract.deposit(
        carol,
        hash,
        currentBlock() + 1,
        { from: alice }
      )
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("can't make a deposit using hashes from empty passwords", async() => {
    try {
      await contract.deposit(
        carol,
        await encryptPasswords("", ""),
        currentBlock() + 1,
        { from: alice, value: 1 }
      );
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("can't make a deposit with too big a deadline", async() => {
    try {
      await contract.deposit(
        carol,
        hash,
        currentBlock() + 1000,
        { from: alice, value: 1 }
      );
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("can be redemeed with correct passwords", async () => {
    await contract.deposit(
      carol,
      hash,
      currentBlock() + 10,
      { from: alice, value: value }
    );

    const initial = await getBalance(carol);
    await contract.redeem(alicePassword, bobPassword, { from: carol });
    const final = await getBalance(carol);

    assert(final.greaterThan(initial));
  });

  it("cannot be redeemed by someone other than the recipient, even with the passwords", async () => {
    await contract.deposit(
      carol,
      hash,
      currentBlock() + 10,
      { from: alice, value: value }
    );

    try {
      await contract.redeem(alicePassword, bobPassword, { from: otherAccount });
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("cannot be redeemed with incorrect passwords", async () => {
    try {
      await contract.deposit(
        carol,
        hash,
        currentBlock() + 10,
        { from: alice, value: value }
      );

      await contract.redeem("invalid", "bobPassword", { from: carol });
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("can't be redeemed if deadline has passed", async() => {
    await contract.deposit(
      carol,
      hash,
      currentBlock() + 1,
      { from: alice, value: value }
    );

    // force creation of a new block, to expire the deadline
    await sendTransaction({ from: accounts[1], to: accounts[0], value: 1 })

    try {
      const tx = await contract.redeem(
        alicePassword,
        bobPassword,
        { from: carol }
      );
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("can be refunded by the owner if deadline has passed", async() => {
    await contract.deposit(
      carol,
      hash,
      currentBlock() + 1,
      { from: alice, value: value }
    );

    // force creation of a new block, to expire the deadline
    await sendTransaction({ from: accounts[1], to: accounts[0], value: 1 })

    const initial = await getBalance(alice);
    await contract.refund(alicePassword, bobPassword, { from: alice });
    const final = await getBalance(alice);

    assert(final.greaterThan(initial));
  });

  it("can be refunded by the owner if there is no deadline", async() => {
    await contract.deposit(
      carol,
      hash,
      0,
      { from: alice, value: value }
    );

    const initial = await getBalance(alice);
    await contract.refund(alicePassword, bobPassword, { from: alice });
    const final = await getBalance(alice);

    assert(final.greaterThan(initial));
  });

  it("cannot by refunded by a non-owner", async() => {
    await contract.deposit(
      carol,
      hash,
      currentBlock() + 10,
      { from: alice, value: value }
    );

    // force creation of a new block, to expire the deadline
    await sendTransaction({ from: accounts[1], to: accounts[0], value: 1 })

    try {
      await contract.refund(alicePassword, bobPassword, { from: carol });
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  });

  it("takes a small fee", async () => {
    const result = await contract.deposit(
      carol,
      hash,
      currentBlock() + 10,
      { from: alice, value: value }
    );

    const transaction = web3.eth.getTransaction(result.tx);
    const txCost = transaction.gasPrice.times(transaction.gas);
    const fees = await contract.totalFees();

    assert(fees.greaterThan(0));
    assert(txCost.greaterThan(fees));
  });

  it("allows the owner to redeem the fees", async () => {
    await contract.deposit(
      carol,
      hash,
      currentBlock() + 10,
      { from: alice, value: value }
    );

    // fees for a single deposit are to low to actually assert that
    // the transaction gave alice a profit
    // because the redemption itself costs more
    assert.ok(await contract.redeemFees({ from: alice }));
  });

  it("logs an event when a deposit is made", async () => {
    await contract.deposit(
      carol,
      hash,
      currentBlock() + 1,
      { from: alice, value: value }
    );

    assertEvent(contract, { event: "LogDeposit", args: { recipient: carol, owner: alice } });
  });

  it("logs an event when a redeem is made", async () => {
    await mine(
      await contract.deposit.sendTransaction(
        carol,
        hash,
        currentBlock() + 10,
        { from: alice, value: value }
      )
    );

    await mine(
      await contract.redeem.sendTransaction(alicePassword, bobPassword, { from: carol })
    )

    assertEvent(contract, { event: "LogRedeem", args: { recipient: carol, owner: alice } });
  });

  it("logs an event when a refund is made", async () => {
    await contract.deposit(
      carol,
      hash,
      0,
      { from: alice, value: value }
    );

    await contract.refund(alicePassword, bobPassword, { from: alice })

    assertEvent(contract, { event: "LogRefund", args: { recipient: carol, owner: alice } });
  });

  it("prevents password re-use", async () => {
    await contract.deposit(
      carol,
      hash,
      0,
      { from: alice, value: value }
    );

    try {
      await contract.deposit(
        alice,
        hash,
        0,
        { from: carol, value: value }
      );
      assert.fail();
    } catch(err) {
      assertRevert(err);
    }
  })
});
