module.exports = {
  networks: {
    ganache: {
      host: "localhost",
      port: 7545,
      network_id: "*",
      gas: 6712390
    },
    net62: {
      host: "localhost",
      port: 9545,
      network_id: "*",
      gas: 3000000
    }
  }
};
