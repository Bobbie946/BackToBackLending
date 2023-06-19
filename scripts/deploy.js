const { ethers } = require("hardhat");
const fs = require('fs');
const config = require('../config.json');
const address = require('../address.json');
const hre = require("hardhat");
const privKey = config.privateKey;
const provider = new ethers.providers.JsonRpcProvider(`https://goerli.infura.io/v3/${process.env.INFURA_TOKEN}`);
// const provider = new ethers.providers.Web3Provider(network.provider)


async function main() {

  const deployer = await new ethers.Wallet(privKey, provider);
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  //deploy comptroller for risk control
  const Comptroller1 = await ethers.getContractFactory("Comptroller");
  const comptroller = await Comptroller1.deploy();
  await comptroller.deployed();
  console.log("Comptroller Deployed to ", comptroller.address);

  //deploy and set price oracle
  const priceOracleFactory = await ethers.getContractFactory("SimplePriceOracle");
  const priceOracle = await priceOracleFactory.deploy();
  await priceOracle.deployed();
  console.log("priceOracle Deployed to ", priceOracle.address);
  await comptroller._setPriceOracle(priceOracle.address);
  console.log("comptroller._setPriceOracle(priceOracle.address) finished");

  //deploy interest rate model
  const interestRateModelFactory = await ethers.getContractFactory("WhitePaperInterestRateModel");
  const interestRateModel = await interestRateModelFactory.deploy(ethers.utils.parseUnits("0", 18), ethers.utils.parseUnits("0", 18));
  await interestRateModel.deployed();
  console.log("interestRateModel Deployed to ", interestRateModel.address);

  //deploy JumpRateModel
  const JumpRateModel1 = await ethers.getContractFactory("JumpRateModel");
  const JumpRateModel = await JumpRateModel1.deploy('25000000000000000', '312500000000000000', '6250000000000000000', '800000000000000000');
  await JumpRateModel.deployed();
  console.log("JumpRateModel Deployed to ", JumpRateModel.address);

  //deploy CErc20Delegate
  const CErc20Delegate1 = await ethers.getContractFactory("CErc20Delegate");
  const CErc20Delegate = await CErc20Delegate1.deploy();
  console.log("CErc20Delegate Deployed to ", CErc20Delegate.address);

  //deploy token A
  const erc20Factory = await ethers.getContractFactory("FiatTokenV2_1");
  const erc20 = await erc20Factory.deploy();
  console.log("MockUSDC Deployed to ", erc20.address);
  const initialize =  await erc20.connect(deployer).initialize("B2BMOCKUSDC", "MOCKUSDC", "USD", 18, deployer.address, deployer.address, deployer.address, deployer.address)
  const configureMinter = await erc20.connect(deployer).configureMinter(deployer.address,"115792089237316195423570985008687907853269984665640564039457584007913129639935")
  const mint = await erc20.connect(deployer).mint(deployer.address, ethers.utils.parseUnits("10000", 18))

  const CErc20Factory = await ethers.getContractFactory("CErc20Immutable");
  const CErc20 = await CErc20Factory.deploy(
    erc20.address,
    comptroller.address,
    interestRateModel.address,
    ethers.utils.parseUnits("1", 18),
    "compound USDC",
    "cUSDC",
    18,
    config.adminAddress
  );
  await CErc20.deployed();
  console.log("CUSDC Deployed to ", CErc20.address);

  //deploy token IB01
  const SanctionsListMockFacory = await ethers.getContractFactory('SanctionsListMock');
  const SanctionsListMock = await SanctionsListMockFacory.deploy();
  await SanctionsListMock.deployed();
  console.log("SanctionsListMock Deployed to ", SanctionsListMock.address);

  const BackedOracleFactory = await ethers.getContractFactory('BackedOracle');
  const BackedOracle = await BackedOracleFactory.deploy(18, "bIB01 Price Feed");
  await BackedOracle.deployed();
  console.log("BackedOracle Deployed to ", BackedOracle.address);

  const BackedFactoryFactory = await ethers.getContractFactory('BackedFactory');
  const BackedFactory = await BackedFactoryFactory.deploy(config.adminAddress);
  await BackedFactory.deployed();
  console.log("BackedFactory Deployed to ", BackedFactory.address);

  const tokenName = "Backed IB01";
  const tokenSymbol = "IB01";
  let minter = deployer.address;
  let burner = deployer.address;
  let pauser = deployer.address;
  let tokenContractOwner = deployer.address;

  const tokenDeployReceipt = await (
      await BackedFactory.deployToken(
        tokenName,
        tokenSymbol,
        tokenContractOwner,
        minter,
        burner,
        pauser,
        SanctionsListMock.address
      )
    ).wait();
  const deployedTokenAddress = tokenDeployReceipt.events?.find((event) => event.event === "NewToken")?.args?.newToken;
  console.log(deployedTokenAddress)
  const ib01token = await ethers.getContractAt("BackedTokenImplementation", deployedTokenAddress);
  await ib01token.connect(deployer).setMinter(deployer.address);
  await ib01token.connect(deployer).setBurner(deployer.address);
  await ib01token.connect(deployer).mint(deployer.address, ethers.utils.parseUnits("10000", 18)) 
  console.log(ib01token.address)

  const CErc20_2Factory = await ethers.getContractFactory("CErc20Immutable");
  const CErc20_2 = await CErc20_2Factory.deploy(
    ib01token.address,
    comptroller.address,
    interestRateModel.address,
    ethers.utils.parseUnits("1", 18),
    "BackToBack IB01",
    "cIB01",
    18,
    config.adminAddress
  );
  await CErc20_2.deployed();
  console.log("CIB01 Deployed to ", CErc20_2.address);

  let data = { 
    WhitePaperInterestRateModel: interestRateModel.address,
    Comptroller: comptroller.address, 
    SimplePriceOracle: priceOracle.address,
    JumpRateModel: JumpRateModel.address,
    CErc20Delegate: CErc20Delegate.address,
    MockUSDC: erc20.address,
    CUSDC: CErc20.address,
    MockIB01: ib01token.address,
    CIB01: CErc20_2.address,

  };
  let dataPrepare = JSON.stringify(data);
  fs.writeFileSync('address.json', dataPrepare);

}

main()
    .then(() => process.exit(0))
    .catch(error =>{
        console.error(error);
        process.exit(1);
    })