
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("dotenv").config();


module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {},
    arbitrum: {
      url:`https://arbitrum-sepolia-rpc.publicnode.com`,
      chainId: 421614,
      accounts: [process.env.DEV_PK]
    }
  },
};
