const { run } = require("hardhat");
const { ethers } = require("hardhat");
const address = require('../address.json');
const config = require('../config.json');
const hre = require("hardhat");
const privKey = config.privateKey;
const provider = new ethers.providers.JsonRpcProvider(`https://sepolia.infura.io/v3/${process.env.INFURA_TOKEN}`);
// const provider = new ethers.providers.Web3Provider(network.provider)


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
const BackedOracle = address.BackedOracle
const BackedFactory = address.BackedFactory
const SanctionsListMock = address.SanctionsListMock
const BackedTokenImplementation = address.BackedTokenImplementation

async function main() {

  const deployer = await new ethers.Wallet(privKey, provider);
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

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
    constructorArguments: []
  });

  await run("verify:verify", {
    address: JumpRateModelAddress,
    contract: "contracts/contracts_compound/JumpRateModel.sol:JumpRateModel",
    constructorArguments: ['25000000000000000', '312500000000000000', '6250000000000000000', '800000000000000000']
  });

  await run("verify:verify", {
    address: CErc20DelegateAddress,
    contract: "contracts/contracts_compound/CErc20Delegate.sol:CErc20Delegate",
    constructorArguments: []
  });

  await run("verify:verify", {
    address: MockUSDCAddress,
    contract: "contracts/BackedFactory/Mocks/USDC.sol:FiatTokenV2_1",
    constructorArguments: []
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
    address: SanctionsListMock,
    contract: "contracts/BackedFactory/Mocks/SanctionsListMock.sol:SanctionsListMock",
    constructorArguments: []
  });

  await run("verify:verify", {
    address: BackedOracle,
    contract: "contracts/BackedFactory/BackedOracle.sol:BackedOracle",
    constructorArguments: [18, "bIB01 Price Feed"]
  });

  await run("verify:verify", {
    address: BackedFactory,
    contract: "contracts/BackedFactory/BackedFactory.sol:BackedFactory",
    constructorArguments: [adminAddress]
  });

  await run("verify:verify", {
    address: BackedTokenImplementation,
    contract: "contracts/BackedFactory/BackedTokenImplementation.sol:BackedTokenImplementation",
    constructorArguments: []
  });

  await run("verify:verify", {
    address: MockIB01Address,
    contract: "contracts/BackedFactory/BackedTokenImplementation.sol:BackedTokenImplementation",
    constructorArguments: []
  });

  await run("verify:verify", {
    address: CIB01Address,
    contract: "contracts/contracts_compound/CErc20Immutable.sol:CErc20Immutable",
    constructorArguments: [MockIB01Address,
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
