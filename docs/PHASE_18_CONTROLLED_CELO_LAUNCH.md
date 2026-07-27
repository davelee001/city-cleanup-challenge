# Phase 18 - Controlled CELO Launch

The launch target remains Celo Sepolia. Mainnet is out of scope until the
testnet pilot, legal review, fraud measurements, treasury governance, and
incident drills are approved.

## Contract safeguards

`RewardTreasury`:

- deploys paused;
- permanently rejects duplicate claim IDs;
- rejects zero claims, recipients, and amounts;
- enforces an immutable per-payment ceiling of at most `0.05 CELO`;
- restricts payment and pause controls to the owner;
- uses nominated, two-step ownership transfer.

The deployment command refuses Celo Sepolia unless the chain ID is `11142220`,
an explicit confirmation is supplied, a dedicated owner is configured, the
reward ceiling is valid, bytecode is present, and post-deployment owner, pause,
and ceiling checks pass. It writes a non-secret deployment record under
`blockchain/deployments/`.

```powershell
cd blockchain
$env:CELO_RPC_URL = "https://<supported-provider>"
$env:CELO_TREASURY_PRIVATE_KEY = "<deployment-key-from-secret-manager>"
$env:CELO_REWARD_OWNER = "<dedicated-owner-or-multisig>"
$env:CELO_CONTRACT_MAX_REWARD_CELO = "0.05"
$env:CELO_SOURCE_COMMIT = "<reviewed-40-character-git-commit>"
$env:CELO_DEPLOY_CONFIRM = "DEPLOY_REWARD_TREASURY_TO_CELO_SEPOLIA"
npm run deploy:celo-sepolia
```

Never paste a seed phrase or key into a ticket, shell history, deployment
record, or repository. Use a dedicated limited testnet signer, rotate it after
suspected exposure, and keep the owner separate from the deployer where
possible.

## One-payment pilot

Select one approved, low-value staging submission and confirm the application
pause is active. Run:

```powershell
$env:CITY_CLEANUP_API_URL = "https://api.staging.example.org"
$env:CITY_CLEANUP_ADMIN_TOKEN = "<short-lived-admin-token>"
$env:CELO_PILOT_SUBMISSION_ID = "<approved-submission-id>"
$env:CELO_PILOT_CONFIRM = "RUN_ONE_CELO_SEPOLIA_PILOT_PAYMENT"
npm run pilot:controlled
```

The runner requires a passing preflight, creates or loads the idempotent claim,
briefly resumes application payouts for that claim, pauses immediately after
broadcast, reconciles confirmations, retries the same submission, verifies the
same transaction is returned, and confirms the application remains paused.
The approved contract owner must then pause the contract through its controlled
signing process and record that transaction; the API intentionally has no
authority to perform this ownership action.

## Required drills

Before widening the pilot:

1. Restart the backend after broadcast and reconcile the same transaction.
2. Retry the same submission through the API and verify the contract claim
   mapping; no second transfer may occur.
3. Pause the application and contract independently and verify both block
   payments.
4. Simulate stuck broadcast, failed transaction, low signer balance, failed
   preflight, and receiver delivery; record Alertmanager acknowledgement.
5. Reconcile database payment totals with explorer transfers and treasury
   balance.
6. Exercise signer compromise: pause, revoke access, rotate secrets, nominate
   and accept a new owner, rerun preflight, and document the timeline.

Record operator, approver, contract address, deployment transaction, source
commit, compiler version, owner, ceiling, submission and claim IDs, reward
amount, transaction, blocks, confirmations, balances, alert evidence, and final
pause states. Do not record private keys.
