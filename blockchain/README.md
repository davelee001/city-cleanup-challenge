**Celo integration (minimal)**

This folder provides a minimal, safe starting point for experimenting with Celo using Hardhat (for compiling/deploying) and ContractKit (for runtime interactions).

Prerequisites
- Node.js 18+ and npm
- (Optional) A Celo testnet RPC URL (Alfajores) and a funded test account

Quick start

1. Install dependencies:

```bash
cd blockchain
npm install
```

2. Create a `.env` file (copy from `.env.example`) and set values:

```
ALFAJORES_RPC=your_rpc_url_here
PRIVATE_KEY=0xyourprivatekey
ACCOUNT_ADDRESS=0xyouraddress
```

3. Compile contracts:

```bash
npm run compile
```

4. Deploy to a local Hardhat node or Alfajores:

Local (start a local node separately):
```bash
npm run deploy:local
```

Alfajores:
```bash
npm run deploy:alfajores
```

5. Use ContractKit example to read balances (requires `ACCOUNT_ADDRESS`):

```bash
npm run contractkit:example
```

Testing
- The folder contains a placeholder test. You can run tests after installing `mocha`/`chai` or adapt to your preferred test runner.

Security and recommendations
- NEVER commit real private keys. Use environment variables, CI secret stores, or a secrets manager (e.g., Azure Key Vault).
- For production workflows, add tests, proper deployment scripts, and CI integration. Consider using `hardhat-deploy` and plugin ecosystems.

Files of interest
- `hardhat.config.js` — network and compiler settings
- `contracts/SimpleStorage.sol` — minimal sample contract
- `scripts/deploy.js` — example deploy script for Hardhat
- `scripts/contractkit_example.js` — simple ContractKit usage to fetch balances

If you want, I can:
- Run `npm install` and `npm run compile` here to verify the setup.
- Replace `SimpleStorage` with an ERC-20 example and an integration snippet for the frontend.
