const txPrice = (tx) => {
  let txHash;
  if (typeof tx === "string") {
    txHash = tx;
  } else if (typeof tx.transactionHash === "string") {
    txHash = tx.transactionHash;
  } else if (typeof tx.tx === "string") {
    txHash = tx.tx;
  }

  const transaction = web3.eth.getTransactionReceipt(txHash);

  return web3.eth.gasPrice.times(transaction.gasUsed);
}

module.exports = txPrice;
