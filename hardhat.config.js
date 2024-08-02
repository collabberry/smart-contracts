
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();


module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {},
    arbitrum: {
      url:`https://arbitrum-sepolia.blockpi.network/v1/rpc/public`,
      accounts: [process.env.DEV_PK]
    }
  },
};
