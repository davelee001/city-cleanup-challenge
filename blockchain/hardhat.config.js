require("dotenv").config();
require("@nomiclabs/hardhat-ethers");

const { ALFAJORES_RPC, PRIVATE_KEY } = process.env;

module.exports = {
  solidity: "0.8.19",
  networks: {
    local: {
      url: "http://127.0.0.1:8545",
      // local chain usually injects accounts
    },
    alfajores: {
      url: ALFAJORES_RPC || "https://alfajores-forno.celo-testnet.org",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    }
  }
};

// commit-3: minor metadata for separate commit
