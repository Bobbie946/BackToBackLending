const address = require('../address.json');
const ethers = require('ethers');
const hre = require("hardhat");
const parseEther = hre.ethers.utils.parseEther;

async function main() {

    const Comptroller = await hre.ethers.getContractFactory("Comptroller");
    const comptroller = Comptroller.attach(address.Comptroller);

    // support market
    let supportMarketsCUSDC = await comptroller._supportMarket(address.CUSDC);
    let supportMarketsCIB01 = await comptroller._supportMarket(address.CIB01);

    const PriceOracle = await hre.ethers.getContractFactory("SimplePriceOracle");
    const priceOracle = PriceOracle.attach(address.SimplePriceOracle);

    //Set token A price
    await priceOracle.setUnderlyingPrice(address.MockUSDC, ethers.utils.parseUnits("1", 18));
    //Set token B price
    await priceOracle.setUnderlyingPrice(address.MockIB01, ethers.utils.parseUnits("150", 18));

    //Set token A/B collateral factor
    await comptroller._setCollateralFactor(address.CIB01,ethers.utils.parseUnits("0.8", 18));
    await comptroller._setCollateralFactor(address.CUSDC,ethers.utils.parseUnits("0.8", 18));

    // set Liquidation Incentive to 1.08
    let _setLiquidationIncentive = await comptroller._setLiquidationIncentive('1080000000000000000');

    // set Close Factor to 85%
    let _setCloseFactor = await comptroller._setCloseFactor('850000000000000000');
    console.log('Finish Admin Setting...');

}
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
