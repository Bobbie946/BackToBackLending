const ethers = require('ethers');
const fs = require('fs');
const config = require('../config.json');
const address = require('../address.json');
const privKey = config.privateKey; //enter your goerli testnet pkey here
const provider = new ethers.providers.JsonRpcProvider('https://eth-goerli.public.blastapi.io');
const erc20_abi = require('./erc20_abi.json')
const CERC20_abi = require('./CERC20_abi.json')
const ib01token_abi = require('./backedimplimentation_abi.json')
const CERC20_2_abi = require('./CERC20_2_abi.json')
const comptroller_abi = require('./comptroller_abi.json')

async function main() {

    const user1 = await new ethers.Wallet(privKey, provider);
    console.log("Interacting contracts with the account:", user1.address);
    console.log("Account balance:", (await user1.getBalance()).toString());

    const erc20 =  new ethers.Contract( address.MockUSDC, erc20_abi, provider );
    const CErc20 = new ethers.Contract( address.CUSDC, CERC20_abi, provider );
    const ib01token = new ethers.Contract( address.MockIB01, ib01token_abi, provider );
    const CErc20_2 = new ethers.Contract( address.CIB01, CERC20_2_abi, provider );
    const comptroller = new ethers.Contract( address.Comptroller, comptroller_abi, provider);

    //Mint token A and supply token A into BackToBack
    await erc20.connect(user1).approve(CErc20.address, ethers.utils.parseUnits("1000", 18));
    console.log("approve cusdc to usdc")

    await CErc20.connect(user1).mint(ethers.utils.parseUnits("10", 18));
    console.log("mint cusdc")
    console.log("balance of CUSDC", (await CErc20.balanceOf(user1.address)).toString())
    console.log("balance of USDC", (await erc20.balanceOf(user1.address)).toString())
    //Redeem token A and supply token A into BackToBack
    await CErc20.connect(user1).redeem(ethers.utils.parseUnits("10", 18));
    console.log("redeem cusdc")
    console.log((await CErc20.balanceOf(user1.address)).toString())
    console.log("balance of USDC", (await erc20.balanceOf(user1.address)).toString())
    //Mint token A and supply token A into BackToBack
    await CErc20.connect(user1).mint(ethers.utils.parseUnits("10", 18));
    console.log("mint again cusdc")
    console.log((await CErc20.balanceOf(user1.address)).toString())
    console.log("balance of USDC", (await erc20.balanceOf(user1.address)).toString())
   
    //Mint token B and supply token B into BackToBack
    await ib01token.connect(user1).approve(CErc20_2.address, ethers.utils.parseUnits("1000", 18));
    console.log("approve cib01 to ib01")
    console.log("balance of CIB01", (await CErc20_2.balanceOf(user1.address)).toString())
    console.log("balance of IB01", (await ib01token.balanceOf(user1.address)).toString())
    await CErc20_2.connect(user1).mint(ethers.utils.parseUnits("1", 18));
    console.log("mint cib01")
    console.log("balance of CIB01", (await CErc20_2.balanceOf(user1.address)).toString())
    console.log("balance of IB01", (await ib01token.balanceOf(user1.address)).toString())

    //Collateralize token B and borrow token A
    await comptroller.connect(user1).enterMarkets([CErc20_2.address]);
    console.log("enterMarkets ib01")
    console.log('usdc token balance before: ', (await erc20.balanceOf(user1.address)).toString())
    console.log('ib01 token balance before: ', (await ib01token.balanceOf(user1.address)).toString())
    await CErc20.connect(user1).borrow(ethers.utils.parseUnits("5", 18))
    console.log("borrow usdc")
    console.log('usdc token balance after borrow: ', (await erc20.balanceOf(user1.address)).toString())
    console.log('ib01 token balance after borrow: ', (await ib01token.balanceOf(user1.address)).toString())
    await CErc20.connect(user1).repayBorrow(ethers.utils.parseUnits("5", 18))
    console.log("repay ib01")
    console.log('usdc token balance after repay: ', (await erc20.balanceOf(user1.address)).toString())
    console.log('ib01 token balance after repay: ', (await ib01token.balanceOf(user1.address)).toString())
    
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
