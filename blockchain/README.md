# Celo reward contract

This package contains the City Cleanup native CELO reward treasury, local
contract tests, and the Celo Sepolia deployment script.

## Setup

Use Node.js 22 and install the pinned dependencies:

```powershell
npm install
npm run compile
npm test
```

Local tests prove that a reward transfers once, a repeated claim ID reverts,
only the owner can pay, and the owner can pause payments.

## Deploy to Celo Sepolia

Copy `.env.example` to `.env` and supply a funded testnet deployment key. Never
commit the key.

```powershell
npm run deploy:celo-sepolia
```

The script prints the deployed `RewardTreasury` address. Configure that address
as `CELO_REWARD_CONTRACT_ADDRESS` in the backend and keep live rewards disabled
until wallet ownership verification, funding, and monitoring are ready.

## Duplicate protection

`payReward(bytes32 claimId, address recipient)` accepts native CELO as the
transaction value. The contract records every successful claim ID in
`paidClaims` and permanently rejects a second payment for that ID. Only the
owner can pay, pause, resume, or transfer ownership.

For production, transfer ownership to a reviewed multisignature account. Images,
locations, and user details must remain off-chain.
