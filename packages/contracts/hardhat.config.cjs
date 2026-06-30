require("@nomicfoundation/hardhat-ethers");
require("dotenv").config({ path: "../../.env", quiet: true });

const arbitrumSepoliaRpcUrl =
  process.env.ARBITRUM_SEPOLIA_RPC_URL || process.env.ASTALANTY_RPC_PRIVATE_URL || "";
const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY || "";

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    arbitrumSepolia: {
      url: arbitrumSepoliaRpcUrl || "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: deployerPrivateKey ? [deployerPrivateKey] : []
    }
  }
};
