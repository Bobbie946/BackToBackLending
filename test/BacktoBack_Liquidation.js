const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
  impersonateAccount,
} = require("@nomicfoundation/hardhat-network-helpers");

async function deployBackToBack() {
  const [owner, user1, user2] = await ethers.getSigners();

  //deploy comptroller for risk control
  const comptrollerFactory = await ethers.getContractFactory("Comptroller");
  const comptroller = await comptrollerFactory.deploy();
  await comptroller.deployed();

  //deploy and set price oracle
  const priceOracleFactory = await ethers.getContractFactory(
    "SimplePriceOracle"
  );
  const priceOracle = await priceOracleFactory.deploy();
  await priceOracle.deployed();
  comptroller._setPriceOracle(priceOracle.address);

  //deploy interest rate model
  const interestRateModelFactory = await ethers.getContractFactory(
    "WhitePaperInterestRateModel"
  );
  const interestRateModel = await interestRateModelFactory.deploy(
    ethers.utils.parseUnits("0", 18),
    ethers.utils.parseUnits("0", 18)
  );
  await interestRateModel.deployed();

  //deploy token A
  const erc20Factory = await ethers.getContractFactory("FiatTokenV2_1");
  const erc20 = await erc20Factory.deploy();
  await erc20.deployed();
  await erc20.initialize("B2BMOCKUSDC", "MOCKUSDC", "USD", 18, owner.address, owner.address,owner.address,owner.address  )
  await erc20.configureMinter(owner.address, "115792089237316195423570985008687907853269984665640564039457584007913129639935")
  await erc20.mint(owner.address, ethers.utils.parseUnits("1000", 18))

  //deploy cToken A
  const CErc20Factory = await ethers.getContractFactory("CErc20Immutable");
  const CErc20 = await CErc20Factory.deploy(
    erc20.address,
    comptroller.address,
    interestRateModel.address,
    ethers.utils.parseUnits("1", 18),
    "BackToBack USDC",
    "cUSDC",
    18,
    owner.address
  );
  await CErc20.deployed();


  //deploy token IB01
  const SanctionsListMockFacory = await ethers.getContractFactory('SanctionsListMock');
  const SanctionsListMock = await SanctionsListMockFacory.deploy();
  await SanctionsListMock.deployed();

  const BackedOracleFactory = await ethers.getContractFactory('BackedOracle');
  const BackedOracle = await BackedOracleFactory.deploy(18, "bIB01 Price Feed");
  await BackedOracle.deployed();

  const BackedFactoryFactory = await ethers.getContractFactory('BackedFactory');
  const BackedFactory = await BackedFactoryFactory.deploy(owner.address);
  await BackedFactory.deployed();

  const tokenName = "Backed IB01";
  const tokenSymbol = "IB01";
  let minter = owner.address;
  let burner = owner.address;
  let pauser = owner.address;
  let tokenContractOwner = owner.address;

  const tokenDeployReceipt = await (
      await BackedFactory.connect(owner).deployToken(
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
  const ib01token = await ethers.getContractAt("BackedTokenImplementation",deployedTokenAddress);
  await ib01token.setMinter(owner.address);
  await ib01token.setBurner(owner.address);
  await ib01token.mint(owner.address, ethers.utils.parseUnits("1000", 18)) 

  const CErc20_2Factory = await ethers.getContractFactory("CErc20Immutable");
  const CErc20_2 = await CErc20_2Factory.deploy(
    ib01token.address,
    comptroller.address,
    interestRateModel.address,
    ethers.utils.parseUnits("1", 18),
    "BackToBack IB01",
    "cIB01",
    18,
    owner.address
  );
  await CErc20_2.deployed();

  return {
    owner,
    user1,
    user2,
    comptroller,
    priceOracle,
    interestRateModel,
    CErc20,
    erc20,
    CErc20_2,
    ib01token,
  };
}

describe("🔥Fork BackToBack Test🔥", function () {
  describe("BackToBack liquidation function", function () {
    it("Execute liquidation by modifying token B collateral factor", async function () {
      const {
        owner,
        user1,
        user2,
        erc20,
        ib01token,
        CErc20,
        CErc20_2,
        priceOracle,
        comptroller,
      } = await loadFixture(deployBackToBack);

      //List token A/B on BackToBack
      await comptroller._supportMarket(CErc20.address);
      await comptroller._supportMarket(CErc20_2.address);

      //Set token A price
      await priceOracle.setUnderlyingPrice(
        CErc20.address,
        ethers.utils.parseUnits("1", 18)
      );
      //Set token B price
      await priceOracle.setUnderlyingPrice(
        CErc20_2.address,
        ethers.utils.parseUnits("100", 18)
      );
      //Set token B collateral factor
      await comptroller._setCollateralFactor(
        CErc20_2.address,
        ethers.utils.parseUnits("0.5", 18)
      );

      //Set close factor
      await comptroller._setCloseFactor(ethers.utils.parseUnits("0.5", 18));

      //Set liquidation incentive
      await comptroller._setLiquidationIncentive(
        ethers.utils.parseUnits("1.2", 18)
      );

      //Mint token A and supply token A into BackToBack
      await erc20.connect(owner).mint(user1.address, ethers.utils.parseUnits("100", 18));
      await erc20
        .connect(user1)
        .approve(CErc20.address, ethers.utils.parseUnits("1000", 18));
      await CErc20.connect(user1).mint(ethers.utils.parseUnits("100", 18));

      //Mint token B and supply token B into BackToBack
      await ib01token.connect(owner).mint(user1.address, ethers.utils.parseUnits("10", 18));
      await ib01token
        .connect(user1)
        .approve(CErc20_2.address, ethers.utils.parseUnits("1000", 18));
      await CErc20_2.connect(user1).mint(ethers.utils.parseUnits("1", 18));

      //Collateralize token B and borrow token A
      await comptroller.connect(user1).enterMarkets([CErc20_2.address]);
      await CErc20.connect(user1).borrow(ethers.utils.parseUnits("50", 18));

      //Modify token B collateral factor
      await comptroller._setCollateralFactor(
        CErc20_2.address,
        ethers.utils.parseUnits("0.3", 18)
      );

      //user2 liquidate user1
      await erc20.connect(owner).mint(user2.address, ethers.utils.parseUnits("50", 18));
      await erc20
        .connect(user2)
        .approve(CErc20.address, ethers.utils.parseUnits("1000", 18));
      await CErc20.connect(user2).liquidateBorrow(
        user1.address,
        ethers.utils.parseUnits("25", 18),
        CErc20_2.address
      );

      expect(await erc20.balanceOf(user2.address)).to.equal(
        ethers.utils.parseUnits("25", 18)
      );
      //protocolSeizeShareMantissa = 2.8%
      //25*1*1.2*(1-0.028)/100
      expect(await CErc20_2.balanceOf(user2.address)).to.equal(
        ethers.utils.parseUnits("0.2916", 18)
      );
    });

    it("Execute liquidation by modifying token B price", async function () {
      const {
        owner,
        user1,
        user2,
        erc20,
        ib01token,
        CErc20,
        CErc20_2,
        priceOracle,
        comptroller,
      } = await loadFixture(deployBackToBack);

      //List token A/B on BackToBack
      await comptroller._supportMarket(CErc20.address);
      await comptroller._supportMarket(CErc20_2.address);

      //Set token A price
      await priceOracle.setUnderlyingPrice(
        CErc20.address,
        ethers.utils.parseUnits("1", 18)
      );
      //Set token B price
      await priceOracle.setUnderlyingPrice(
        CErc20_2.address,
        ethers.utils.parseUnits("100", 18)
      );
      //Set token B collateral factor
      await comptroller._setCollateralFactor(
        CErc20_2.address,
        ethers.utils.parseUnits("0.5", 18)
      );

      //Set close factor
      await comptroller._setCloseFactor(ethers.utils.parseUnits("0.5", 18));

      //Set liquidation incentive
      await comptroller._setLiquidationIncentive(
        ethers.utils.parseUnits("1.2", 18)
      );

      //Mint token A and supply token A into BackToBack
      await erc20.connect(owner).mint(user1.address, ethers.utils.parseUnits("100", 18));
      await erc20
        .connect(user1)
        .approve(CErc20.address, ethers.utils.parseUnits("1000", 18));
      await CErc20.connect(user1).mint(ethers.utils.parseUnits("100", 18));

      //Mint token B and supply token B into BackToBack
      await ib01token.connect(owner).mint(user1.address, ethers.utils.parseUnits("10", 18));
      await ib01token
        .connect(user1)
        .approve(CErc20_2.address, ethers.utils.parseUnits("1000", 18));
      await CErc20_2.connect(user1).mint(ethers.utils.parseUnits("1", 18));

      //Collateralize token B and borrow token A
      await comptroller.connect(user1).enterMarkets([CErc20_2.address]);
      await CErc20.connect(user1).borrow(ethers.utils.parseUnits("50", 18));

      //Modify token B price
      await priceOracle.setUnderlyingPrice(
        CErc20_2.address,
        ethers.utils.parseUnits("80", 18)
      );

      //user2 liquidate user1
      await erc20.connect(owner).mint(user2.address, ethers.utils.parseUnits("50", 18));
      await erc20
        .connect(user2)
        .approve(CErc20.address, ethers.utils.parseUnits("1000", 18));
      await CErc20.connect(user2).liquidateBorrow(
        user1.address,
        ethers.utils.parseUnits("25", 18),
        CErc20_2.address
      );

      //check user2 remained token A after repay user1 borrow
      expect(await erc20.balanceOf(user2.address)).to.equal(
        ethers.utils.parseUnits("25", 18)
      );
      //protocolSeizeShareMantissa = 2.8%
      //25*1*1.2*(1-0.028)/80
      expect(await CErc20_2.balanceOf(user2.address)).to.equal(
        ethers.utils.parseUnits("0.3645", 18)
      );
    });
  });

  describe("Flash loan liquidate", function () {
    //fork Ethereum mainnet ✅
    //get UNI/ USDC contract address ✅
    //check AAVE flash loan contract
    //build smart contract for receiverAddress of flash loan

    let uniAddress = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";
    let usdcAddress = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

    // let owner;
    // let user1;
    // let user2;
    // let comptroller;
    // let priceOracle;
    // let interestRateModel;

    // before(async function () {
    //   const {
    //     ownerc,
    //     user1c,
    //     user2c,
    //     comptrollerc,
    //     priceOraclec,
    //     interestRateModelc,
    //     CErc20,
    //     erc20,
    //     CErc20_2,
    //     ib01token,
    //   } = await deployBackToBack();
    //   owner = ownerc;
    //   user1 = user1c;
    //   user2 = user2c;
    //   comptroller = comptrollerc;
    //   priceOracle = priceOraclec;
    //   interestRateModel = interestRateModelc;
    // });

    it("User2 liquidate user1 by repaying self USDC to get UNI", async function () {
      const {
        owner,
        user1,
        user2,
        comptroller,
        priceOracle,
        interestRateModel,
      } = await loadFixture(deployBackToBack);

      //deploy cToken UNI on BackToBack
      const CErc20UNIFactory = await ethers.getContractFactory(
        "CErc20Immutable"
      );
      const CErc20UNI = await CErc20UNIFactory.deploy(
        uniAddress,
        comptroller.address,
        interestRateModel.address,
        ethers.utils.parseUnits("1", 18),
        "BackToBack UNI",
        "cUNI",
        18,
        owner.address
      );
      await CErc20UNI.deployed();

      //deploy cToken USDC on BackToBack
      const CErc20USDCFactory = await ethers.getContractFactory(
        "CErc20Immutable"
      );
      const CErc20USDC = await CErc20USDCFactory.deploy(
        usdcAddress,
        comptroller.address,
        interestRateModel.address,
        ethers.utils.parseUnits("1", 18),
        "BackToBack UNI",
        "cUNI",
        18,
        owner.address
      );
      await CErc20USDC.deployed();

      //List UNI/USDC on BackToBack
      await comptroller._supportMarket(CErc20UNI.address);
      await comptroller._supportMarket(CErc20USDC.address);

      //Set UNI/USDC price
      await priceOracle.setUnderlyingPrice(
        CErc20UNI.address,
        ethers.utils.parseUnits("10", 18)
      );
      await priceOracle.setUnderlyingPrice(
        CErc20USDC.address,
        ethers.utils.parseUnits("1", 30)
      );

      //Set close factor
      await comptroller._setCloseFactor(ethers.utils.parseUnits("0.5", 18));

      //Set liquidation incentive
      await comptroller._setLiquidationIncentive(
        ethers.utils.parseUnits("1.08", 18)
      );

      //Set UNI collateral factor
      await comptroller._setCollateralFactor(
        CErc20UNI.address,
        ethers.utils.parseUnits("0.5", 18)
      );

      //Impersonate wallet to get UNI/USDC
      let binanceWalletAddress = "0xf977814e90da44bfa03b6295a0616a897441acec";
      await impersonateAccount(binanceWalletAddress);
      const binanceWallet = await ethers.getSigner(binanceWalletAddress);
      let erc20ABI = "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20";
      usdc = await ethers.getContractAt(erc20ABI, usdcAddress);
      uni = await ethers.getContractAt(erc20ABI, uniAddress);
      await uni
        .connect(binanceWallet)
        .transfer(user1.address, ethers.utils.parseUnits("1000", 18));
      await usdc
        .connect(binanceWallet)
        .transfer(user2.address, ethers.utils.parseUnits("8000", 6));

      //user1 collateralize 1000 UNI to borrow 5000 USDC
      await uni
        .connect(user1)
        .approve(CErc20UNI.address, ethers.utils.parseUnits("10000", 18));
      await usdc
        .connect(user2)
        .approve(CErc20USDC.address, ethers.utils.parseUnits("10000", 6));

      await CErc20USDC.connect(user2).mint(ethers.utils.parseUnits("5000", 6));
      await CErc20UNI.connect(user1).mint(ethers.utils.parseUnits("1000", 18));
      await comptroller.connect(user1).enterMarkets([CErc20UNI.address]);
      await CErc20USDC.connect(user1).borrow(
        ethers.utils.parseUnits("5000", 6)
      );

      //modify UNI price to $6.2 to make shortfall
      await priceOracle.setUnderlyingPrice(
        CErc20UNI.address,
        ethers.utils.parseUnits("6.2", 18)
      );

      //user2 liquidate user1
      await CErc20USDC.connect(user2).liquidateBorrow(
        user1.address,
        ethers.utils.parseUnits("2500", 6),
        CErc20UNI.address
      );

      expect(await CErc20UNI.balanceOf(user2.address)).to.greaterThan(0);
      expect(await CErc20UNI.balanceOf(user1.address)).to.lessThan(
        ethers.utils.parseUnits("1000", 18)
      );
      expect(await usdc.balanceOf(user2.address)).to.equal(
        ethers.utils.parseUnits("500", 6)
      );
    });

    it("User2 use flash loan to liquidate user1", async function () {
      const {
        owner,
        user1,
        user2,
        comptroller,
        priceOracle,
        interestRateModel,
      } = await loadFixture(deployBackToBack);

      let lendingPoolAddressesProviderAddress =
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5";

      //deploy cToken UNI on BackToBack
      const CErc20UNIFactory = await ethers.getContractFactory(
        "CErc20Immutable"
      );
      const CErc20UNI = await CErc20UNIFactory.deploy(
        uniAddress,
        comptroller.address,
        interestRateModel.address,
        ethers.utils.parseUnits("1", 18),
        "BackToBack UNI",
        "cUNI",
        18,
        owner.address
      );
      await CErc20UNI.deployed();

      //deploy cToken USDC on BackToBack
      const CErc20USDCFactory = await ethers.getContractFactory(
        "CErc20Immutable"
      );
      const CErc20USDC = await CErc20USDCFactory.deploy(
        usdcAddress,
        comptroller.address,
        interestRateModel.address,
        ethers.utils.parseUnits("1", 18),
        "BackToBack UNI",
        "cUNI",
        18,
        owner.address
      );
      await CErc20USDC.deployed();

      //List UNI/USDC on BackToBack
      await comptroller._supportMarket(CErc20UNI.address);
      await comptroller._supportMarket(CErc20USDC.address);

      //Set UNI/USDC price
      await priceOracle.setUnderlyingPrice(
        CErc20UNI.address,
        ethers.utils.parseUnits("10", 18)
      );
      await priceOracle.setUnderlyingPrice(
        CErc20USDC.address,
        ethers.utils.parseUnits("1", 30)
      );

      //Set close factor
      await comptroller._setCloseFactor(ethers.utils.parseUnits("0.5", 18));

      //Set liquidation incentive
      await comptroller._setLiquidationIncentive(
        ethers.utils.parseUnits("1.08", 18)
      );

      //Set UNI collateral factor
      await comptroller._setCollateralFactor(
        CErc20UNI.address,
        ethers.utils.parseUnits("0.5", 18)
      );

      //Impersonate wallet to get UNI / USDC
      let binanceWalletAddress = "0xf977814e90da44bfa03b6295a0616a897441acec";
      await impersonateAccount(binanceWalletAddress);
      const binanceWallet = await ethers.getSigner(binanceWalletAddress);
      let erc20ABI = "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20";
      usdc = await ethers.getContractAt(erc20ABI, usdcAddress);
      uni = await ethers.getContractAt(erc20ABI, uniAddress);
      await uni
        .connect(binanceWallet)
        .transfer(user1.address, ethers.utils.parseUnits("1000", 18));
      await usdc
        .connect(binanceWallet)
        .transfer(user2.address, ethers.utils.parseUnits("5000", 6));

      //user2 supply USDC into BackToBack
      await usdc
        .connect(user2)
        .approve(CErc20USDC.address, ethers.utils.parseUnits("10000", 6));
      await CErc20USDC.connect(user2).mint(ethers.utils.parseUnits("5000", 6));

      //user1 collateralize 1000 UNI to borrow 5000 USDC
      await uni
        .connect(user1)
        .approve(CErc20UNI.address, ethers.utils.parseUnits("10000", 18));
      await CErc20UNI.connect(user1).mint(ethers.utils.parseUnits("1000", 18));
      await comptroller.connect(user1).enterMarkets([CErc20UNI.address]);
      await CErc20USDC.connect(user1).borrow(
        ethers.utils.parseUnits("5000", 6)
      );

      //modify UNI price to $6.2 to make shortfall
      await priceOracle.setUnderlyingPrice(
        CErc20UNI.address,
        ethers.utils.parseUnits("6.2", 18)
      );

      //user2 use flash loan to liquidate user1
      const flashLoanFactory = await ethers.getContractFactory("flashLoan");
      const flashLoan = await flashLoanFactory.deploy(
        lendingPoolAddressesProviderAddress
      );
      await flashLoan.deployed();
      await flashLoan
        .connect(user2)
        .setTarget(user1.address, CErc20USDC.address, CErc20UNI.address);
      await flashLoan.connect(user2).myFlashLoanCall();

      //check flashLoan USDC balance
      expect(await usdc.balanceOf(flashLoan.address)).to.greaterThan(
        ethers.utils.parseUnits("121", 6)
      );

      //withdraw USDC from flahLoan contract
      await flashLoan.connect(user2).withdrawProfit();
      let usdcProfit = await usdc.balanceOf(user2.address);
      expect(usdcProfit).to.greaterThan(ethers.utils.parseUnits("121", 6));
      console.log("Final profit:", usdcProfit.toString(), "USDC");
    });
  });
});
