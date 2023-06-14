# BackToBackLending

## Local Development

Clone this repository, install Node.js dependencies, and build the source code:

```shell
git clone https://github.com/Bobbie946/BackToBackLending.git
cd ./BackToBackLending
npm install
build `.env` file and input `INFURA_TOKEN = XXXXX...` (XXXXX... is your key)
```

## Test Scripts

### BackToBack_MintRedeem.js

```
npx hardhat test test/BacktoBack_MintRedeem.js  
```

1.  Hardhat  test deploy : CErc20(`CErc20.sol`) and Comptroller(`Comptroller.sol`) 
   - CToken  decimals =  18
   - CErc20 underlying ERC20 token decimals = 18
   - Use `SimplePriceOracle` as Oracle
   - suppose interest rate = 0%
   - initial exchangeRate =  1:1
2. user1 mint/redeem CErc20
   - User1 mint 100 （100 \* 10^18） ERC20 , 
   - User1 mint 100 CErc20 token by collateral 100 ERC20 into CErc20 Contract
   - User1 redeem 100 CErc20 token and get back 100 ERC20

### BackToBack_BorrowRepay.js

```
npx hardhat test test/BackToBack_BorrowRepay.js  
```

3. let user1 borrow/repay
   - set Oracle price:  token A price (USDC) = $1，token B (IB01) price =  $100
   - set Token B collateral factor = 50%
   - User1 deposit token B as collateral and borrow  50  token A.
4. change token B collateral factor，user2 excecutes liquidation of user1's debts. 
5. change token B price，user2 excecutes liquidation of user1's debts. 


### BackToBack_Liquidation.js


```javascript
modify enabled to true
 networks: {
    hardhat: {
      forking: {
        enabled: true,
        url: `https://mainnet.infura.io/v3/${process.env.INFURA_TOKEN}`,
        blockNumber: 15815693,
      },
    },
  },
```

```
npx hardhat test test/BackToBack_Liquidation.js
```

6.  Hardhat fork ，use AAVE  Flash loan to liquidate user1's debts:
   - Fork Ethereum mainnet at block 15815693 ([Reference](https://hardhat.org/hardhat-network/docs/guides/forking-other-networks#resetting-the-fork))
   - cToken  decimals = 18，initial exchangeRate =  1:1
   - Close factor  =  50%
   - Liquidation incentive =  8% (1.08 \* 1e18)  
   - token a = USDC ; token b =  UNI 
   - price of USDC =  $1，price of UNI = $10
   - set UNI  collateral factor  = 50%
   - User1 deposite 1000 UNI and borrow 5000 of USDC
   - change UNI price to $6.2, so that User1 gets to Shortfall，let User2 uses AAVE  Flash loan to liquidate User1
   - after the liquidation, user2 can make 121 USD profit.（Liquidation incentive = 8%）

   ## Deploy Scripts

   ```
     npx hardhat run scripts/deploy.js
      npx hardhat run scripts/adminrun.js
    ```

