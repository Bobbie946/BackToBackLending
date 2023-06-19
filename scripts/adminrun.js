const ethers = require('ethers');
const fs = require('fs');
const config = require('../config.json');
const address = require('../address.json');
const hre = require("hardhat");
const parseEther = hre.ethers.utils.parseEther;
const privKey = config.privateKey;
const provider = new ethers.providers.JsonRpcProvider(`https://goerli.infura.io/v3/${process.env.INFURA_TOKEN}`);



async function main() {

    const deployer = await new ethers.Wallet(privKey, provider);
    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const Comptroller = await hre.ethers.getContractFactory("Comptroller");
    const comptroller = Comptroller.attach(address.Comptroller);

    // support market
    let supportMarketsCUSDC = await comptroller.connect(deployer)._supportMarket(address.CUSDC);
    let supportMarketsCIB01 = await comptroller.connect(deployer)._supportMarket(address.CIB01);
    console.log("set supportMarketsCUSDC", "set upportMarketsCIB01");

    //Set token A/B collateral factor
    await comptroller.connect(deployer)._setCollateralFactor(address.CIB01,ethers.utils.parseUnits("0.8", 18));
    await comptroller.connect(deployer)._setCollateralFactor(address.CUSDC,ethers.utils.parseUnits("0.8", 18));
    console.log("_setCollateralFactor");

    // set Liquidation Incentive to 1.08
    let _setLiquidationIncentive = await comptroller.connect(deployer)._setLiquidationIncentive('1080000000000000000');
    console.log("_setLiquidationIncentive");

    // set Close Factor to 85%
    let _setCloseFactor = await comptroller.connect(deployer)._setCloseFactor('850000000000000000');
    console.log("_setCloseFactor");

    const PriceOracle = await hre.ethers.getContractFactory("SimplePriceOracle");
    const priceOracle = PriceOracle.attach(address.SimplePriceOracle);

    //Set token A price
    let priceCUSDC = await priceOracle.connect(deployer).setUnderlyingPrice(address.CUSDC,  ethers.utils.parseUnits("1", 18));
    //Set token B price
    let priceCIB01 = await priceOracle.connect(deployer).setUnderlyingPrice(address.CIB01, ethers.utils.parseUnits("150", 18));
    console.log("set priceOracle");

    console.log('Finish Admin Setting...');

}
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
