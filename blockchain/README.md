# Celo reward contract

This package contains the native CELO `RewardTreasury`, local contract tests,
and a guarded Celo Sepolia deployment script.

## Local verification

Use Node.js 22:

```powershell
npm ci
npm run compile
npm test
```

Tests cover paused deployment, owner authorization, invalid inputs, the
immutable payment ceiling, successful payment, duplicate rejection, failed
recipient rollback, and nominated two-step ownership transfer.

## Contract controls

The contract starts paused and accepts native CELO through each `payReward`
transaction. A successful claim ID can never be paid again. The immutable
deployment ceiling prevents a single call from exceeding the approved pilot
maximum even if the application is misconfigured.

Ownership transfer is two-step: the current owner nominates `pendingOwner`, and
that address must call `acceptOwnership`. Use a reviewed dedicated signer or
multisignature owner. Images, locations, and user details remain off-chain.

## Guarded Celo Sepolia deployment

Copy `.env.example` to an untracked secret source and configure a supported RPC,
limited deployment signer, separate owner, reward ceiling, and confirmation:

```powershell
$env:CELO_DEPLOY_CONFIRM = "DEPLOY_REWARD_TREASURY_TO_CELO_SEPOLIA"
npm run deploy:celo-sepolia
```

The command verifies chain ID `11142220`, configuration, deployed bytecode,
owner, pause state, and ceiling. It writes a non-secret JSON deployment record
under `deployments/`. Preserve that record with the release evidence, verify
the source on the selected Celo explorer, and keep both contract and application
payout controls paused until the controlled pilot is approved.

See
[`docs/PHASE_18_CONTROLLED_CELO_LAUNCH.md`](../docs/PHASE_18_CONTROLLED_CELO_LAUNCH.md)
for the full pilot and incident-drill sequence.
