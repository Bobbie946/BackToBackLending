const { run } = require("hardhat");
const { ethers } = require("hardhat");
const address = require('../address.json');
const config = require('../config.json');

const adminAddress = config.adminAddress;
const deployerAddress = config.adminAddress;
const comptrollerAddress = address.Comptroller
const WhitePaperInterestRateModelAddress = address.WhitePaperInterestRateModel
const SimplePriceOracleAddress = address.SimplePriceOracle
const JumpRateModelAddress = address.JumpRateModel
const CErc20DelegateAddress = address.CErc20Delegate
const MockUSDCAddress = address.MockUSDC
const CUSDCAddress = address.CUSDC
const MockIB01Address = address.MockIB01
const CIB01Address = address.CIB01

async function main() {

  await run("verify:verify", {
    address: comptrollerAddress,
    contract: "contracts/contracts_compound/Comptroller.sol:Comptroller",
    constructorArguments: []
  });

  await run("verify:verify", {
    address: WhitePaperInterestRateModelAddress,
    contract: "contracts/contracts_compound/WhitePaperInterestRateModel.sol:WhitePaperInterestRateModel",
    constructorArguments: [ethers.utils.parseUnits("0", 18), ethers.utils.parseUnits("0", 18)]
  });

  await run("verify:verify", {
    address: SimplePriceOracleAddress,
    contract: "contracts/contracts_compound/SimplePriceOracle.sol:SimplePriceOracle",
    constructorArguments: [deployerAddress, priceOracleV1Address, ethUsdAggregatorAddress, flagsAddress]
  });

  await run("verify:verify", {
    address: JumpRateModelAddress,
    contract: "contracts/contracts_compound/JumpRateModel.sol:JumpRateModel",
    constructorArguments: ['25000000000000000', '312500000000000000', '6250000000000000000', '800000000000000000']
  });

  await run("verify:verify", {
    address: CErc20DelegateAddress,
    contract: "contracts/contracts_compound/CErc20Delegate.sol:CErc20Delegate",
    constructorArguments: ['25000000000000000', '312500000000000000', '6250000000000000000', '800000000000000000']
  });

  await run("verify:verify", {
    address: MockUSDCAddress,
    contract: "contracts/contracts_compound/MockUSDC.sol:MockUSDC",
    constructorArguments: [ethers.utils.parseUnits("10000", 18)]
  });

  await run("verify:verify", {
    address: CUSDCAddress,
    contract: "contracts/contracts_compound/CErc20Immutable.sol:CErc20Immutable",
    constructorArguments: [MockUSDCAddress,
        comptrollerAddress,
        WhitePaperInterestRateModelAddress,
        ethers.utils.parseUnits("1", 18),
        "compound USDC",
        "cUSDC",
        18,
        adminAddress]
  });

  await run("verify:verify", {
    address: MockIB01Address,
    contract: "contracts/contracts_compound/MockIB01.sol:MockIB01",
    constructorArguments: [ethers.utils.parseUnits("10000", 18)]
  });

  await run("verify:verify", {
    address: CIB01Address,
    contract: "contracts/contracts_compound/CErc20Immutable.sol:CErc20Immutable",
    constructorArguments: [MockUSDCAddress,
        comptrollerAddress,
        WhitePaperInterestRateModelAddress,
        ethers.utils.parseUnits("1", 18),
        "compound IB01",
        "cIB01",
        18,
        adminAddress]
  });


}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
