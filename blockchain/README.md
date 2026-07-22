**Celo integration (minimal)**

This folder contains a minimal Hardhat + ContractKit setup to experiment with Celo deployments.

Quick steps:

1. Install dependencies from the `blockchain` folder:

```bash
cd blockchain
npm install
```

2. Compile contracts:

```bash
npm run compile
```

3. Deploy to Alfajores (requires `ALFAJORES_RPC` and `PRIVATE_KEY` in `.env`):

```bash
npm run deploy:alfajores
```

4. Run the ContractKit example to fetch balances (set `ACCOUNT_ADDRESS` in `.env`):

```bash
npm run contractkit:example
```

Notes:
- This is intentionally minimal. You may want to add tests, Hardhat plugins, or an ERC20 example contract.
- Keep private keys out of source control; use a CI secret store or Azure Key Vault for production.
