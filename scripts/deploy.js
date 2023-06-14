const { ethers } = require("hardhat");
const fs = require('fs');
const config = require('../config.json');


async function main() {
  deployer_address = ''
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
  // const WhitePaperInterestRateModel1 = await ethers.getContractFactory("WhitePaperInterestRateModel");
  // const WhitePaperInterestRateModel = await WhitePaperInterestRateModel1.deploy(0, '200000000000000000');
  // console.log("WhitePaperInterestRateModel Deployed to ", WhitePaperInterestRateModel.address);

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
  const erc20Factory = await ethers.getContractFactory("MockUSDC");
  const erc20 = await erc20Factory.deploy(ethers.utils.parseUnits("10000", 18));
  console.log("MockUSDC Deployed to ", erc20.address);

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

  //deploy token B
  const ib01Factory = await ethers.getContractFactory("MockIB01");
  const ib01 = await ib01Factory.deploy(ethers.utils.parseUnits("10000", 18));
  console.log("MockIB01 Deployed to ", ib01.address);

  const CErc20_2Factory = await ethers.getContractFactory("CErc20Immutable");
  const CErc20_2 = await CErc20_2Factory.deploy(
    ib01.address,
    comptroller.address,
    interestRateModel.address,
    ethers.utils.parseUnits("1", 18),
    "compound IB01",
    "cIB01",
    18,
    config.adminAddress
  );
  await CErc20_2.deployed();
  console.log("CIB01 Deployed to ", CErc20_2.address);

  // const Unitroller1 = await ethers.getContractFactory("Unitroller");
  // const Unitroller = await Unitroller1.deploy();
  // console.log("Unitroller Deployed to ", Unitroller.address);

  // const _setPendingImplementation = await Unitroller._setPendingImplementation(Comptroller.address);
  // const _acceptImplementation = await Unitroller._acceptImplementation();
  // const _become = await Comptroller._become(Unitroller.address);
  
  // const CEther1 = await ethers.getContractFactory("CEther");
  // const CEther = await CEther1.deploy(Unitroller.address, WhitePaperInterestRateModel.address, '200000000000000000000000000', 'Compound Ether', 'cETH', '8', config.adminAddress);
  // console.log("CEther Deployed to ", CEther.address);

  // const JPT1 = await ethers.getContractFactory("JPT");
  // const JPT = await JPT1.deploy('20000000000000000000000000');
  // console.log("JPT Deployed to ", JPT.address);

  // const cJPT1 = await ethers.getContractFactory("CErc20Delegator");
  // const cJPT = await cJPT1.deploy(JPT.address, Unitroller.address, JumpRateModel.address, '200000000000000000000000000', 'Jirapat Token', 'cJPT', '8', config.adminAddress, CErc20Delegate.address, '0x00');
  // console.log("cJPT Deployed to ", cJPT.address);

  let data = { 
    WhitePaperInterestRateModel: interestRateModel.address,
    Comptroller: comptroller.address, 
    SimplePriceOracle: priceOracle.address,
    JumpRateModel: JumpRateModel.address,
    CErc20Delegate: CErc20Delegate.address,
    MockUSDC: erc20.address,
    CUSDC: CErc20.address,
    MockIB01: ib01.address,
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