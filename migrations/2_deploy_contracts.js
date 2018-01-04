var Remittance = artifacts.require("./Remittance.sol");

module.exports = function(deployer) {
  deployer.deploy(Remittance, "", "", 0, { value: 1 });
};
