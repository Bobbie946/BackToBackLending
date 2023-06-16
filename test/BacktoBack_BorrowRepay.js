const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("🔥Fork BackToBack Test🔥", function () {
  let owner;
  let user1;
  let user2;
  let comptroller;
  let priceOracle;
  let erc20;
  let ib01token;
  let CErc20;
  let CErc20_2;

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
    await comptroller._setPriceOracle(priceOracle.address);

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
      CErc20,
      erc20,
      comptroller,
      priceOracle,
      CErc20_2,
      ib01token,
    };
  }

  beforeEach(async () => {
    let fixture = await loadFixture(deployBackToBack);
    owner = fixture.owner;
    user1 = fixture.user1;
    user2 = fixture.user2;
    comptroller = fixture.comptroller;
    priceOracle = fixture.priceOracle;
    erc20 = fixture.erc20;
    ib01token = fixture.ib01token;
    CErc20 = fixture.CErc20;
    CErc20_2 = fixture.CErc20_2;
  });

  describe("Deploy underlying token", function () {
    it("Deployer can get 1000 initial supply for token A", async function () {
      expect(await erc20.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("1000", 18)
      );
      console.log("🐱underlying ERC20 token A(USDC):", erc20.address);
    });

    it("Deployer can get 1000 initial supply for token B", async function () {
      expect(await ib01token.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("1000", 18)
      );
      console.log("🐶underlying ERC20 token B(IB01):", ib01token.address);
    });
  });

  describe("Compound mint/redeem function", function () {
    it("User can correctly supply BackToBack with 100 token A", async function () {
      await comptroller._supportMarket(CErc20.address);
      await erc20.approve(CErc20.address, ethers.utils.parseUnits("10000", 18));
      await CErc20.mint(ethers.utils.parseUnits("100", 18));
      expect(await CErc20.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("100", 18)
      );
      expect(await erc20.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("900", 18)
      );
      console.log("🐱🐱CErc20 token A(cUSDC):", CErc20.address);
    });

    it("User can correctly redeem all 100 token A with cToken A", async function () {
      await comptroller._supportMarket(CErc20.address);
      await erc20.approve(CErc20.address, ethers.utils.parseUnits("10000", 18));
      await CErc20.mint(ethers.utils.parseUnits("100", 18));
      await CErc20.redeem(ethers.utils.parseUnits("100", 18));
      expect(await CErc20.balanceOf(owner.address)).to.equal(0);
      expect(await erc20.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("1000", 18)
      );
    });

    it("User can correctly supply BackToBack with 500 token B", async function () {
      await comptroller._supportMarket(CErc20_2.address);
      await ib01token.approve(
        CErc20_2.address,
        ethers.utils.parseUnits("10000", "18")
      );
      await CErc20_2.mint(ethers.utils.parseUnits("500", 18));
      expect(await CErc20_2.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("500", 18)
      );
      expect(await ib01token.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("500", 18)
      );
      console.log("🐶🐶CErc20 token B(cIB01):", CErc20_2.address);
    });

    it("User can correctly redeem partial 300 token B with cToken B", async function () {
      await comptroller._supportMarket(CErc20_2.address);
      await ib01token.approve(
        CErc20_2.address,
        ethers.utils.parseUnits("10000", "18")
      );
      await CErc20_2.mint(ethers.utils.parseUnits("500", 18));
      await CErc20_2.redeem(ethers.utils.parseUnits("300", 18));
      expect(await CErc20_2.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("200", 18)
      );
      expect(await ib01token.balanceOf(owner.address)).to.equal(
        ethers.utils.parseUnits("800", 18)
      );
    });
  });

  describe("BackToBack borrow/repay function", function () {
    it("User should not be able to borrow A token when there's no enough collateral", async function () {
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

      //Mint token A and supply token A into BackToBack
      await erc20.connect(owner).mint(user1.address, ethers.utils.parseUnits("100", 18));
      await erc20
        .connect(user1)
        .approve(CErc20.address, ethers.utils.parseUnits("1000", 18));
      await CErc20.connect(user1).mint(ethers.utils.parseUnits("100", 18));

      // await CErc20.connect(user1).borrow(ethers.utils.parseUnits("50", 18));

      await expect(
        CErc20.connect(user1).borrow(ethers.utils.parseUnits("50", 18))
      )
        .to.revertedWithCustomError(CErc20, "BorrowComptrollerRejection")
        .withArgs(4);
    });

    it("User can borrow A token by collateralizing B token", async function () {
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
      // await CErc20.connect(user1).borrow(ethers.utils.parseUnits("50", 18));

      expect(
        await CErc20.connect(user1).borrow(ethers.utils.parseUnits("50", 18))
      )
        .to.emit(CErc20, "Borrow")
        .withArgs(
          user1.address,
          ethers.utils.parseUnits("50", 18),
          ethers.utils.parseUnits("50", 18),
          ethers.utils.parseUnits("50", 18)
        )
        .to.changeEtherBalance(erc20, user1, ethers.utils.parseUnits("50", 18))
        .to.changeEtherBalance(
          CErc20_2,
          user1,
          ethers.utils.parseUnits("1", 18)
        );
    });
  });

  describe("BackToBack liquidation function", function () {
    it("Execute liquidation by modifying token B collateral factor", async function () {
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
});
