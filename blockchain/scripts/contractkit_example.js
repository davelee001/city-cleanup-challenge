require('dotenv').config();
const ContractKit = require('@celo/contractkit').newKit;

async function main() {
  const RPC = process.env.ALFAJORES_RPC || 'https://alfajores-forno.celo-testnet.org';
  const kit = ContractKit(RPC);

  const address = process.env.ACCOUNT_ADDRESS;
  if (!address) {
    console.log('Set ACCOUNT_ADDRESS in .env to see an example balance.');
    return;
  }

  const balance = await kit.getTotalBalance(address);
  console.log('Balances for', address, JSON.stringify(balance, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// commit-6
