function mineSingle(txHash, interval) {
  const transactionReceiptAsync = (resolve, reject) => {
    web3.eth.getTransactionReceipt(txHash, (error, receipt) => {
      if (error) {
        reject(error);
      } else if (receipt == null) {
        setTimeout(
          () => transactionReceiptAsync(resolve, reject),
          interval ? interval : 500);
      } else {
        resolve(receipt);
      }
    });
  };

  return new Promise(transactionReceiptAsync);
}

function mine(txHash, interval) {
  if (Array.isArray(txHash)) {
    return Promise.all(txHash.map(
      oneTxHash => mineSingle(oneTxHash, interval)));

  } else if (typeof txHash === "string") {
    return mineSingle(txHash);

  } else {
    throw new Error("Invalid Type: " + txHash);
  }
};

module.exports = mine;

