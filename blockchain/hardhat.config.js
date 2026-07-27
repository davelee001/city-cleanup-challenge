require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");

const { CELO_RPC_URL, CELO_TREASURY_PRIVATE_KEY } = process.env;

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    local: {
      url: "http://127.0.0.1:8545",
      // local chain usually injects accounts
    },
    celoSepolia: {
      url: CELO_RPC_URL || "https://forno.celo-sepolia.celo-testnet.org",
      chainId: 11142220,
      accounts: CELO_TREASURY_PRIVATE_KEY ? [CELO_TREASURY_PRIVATE_KEY] : []
    }
  }
};

// commit-3: minor metadata for separate commit
