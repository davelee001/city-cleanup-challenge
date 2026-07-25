# Phase 5 - Idempotent Celo Sepolia Rewards

Phase 5 connects an approved cleanup submission to one controlled native CELO
testnet payment. Evidence and personal data remain off-chain.

## Pilot reward policy

The server-owned `celo-testnet-v1` policy starts with `0.01 CELO` and applies
these multipliers:

| Waste category | Multiplier |
| --- | ---: |
| Paper | 0.80x |
| Plastic | 1.00x |
| Mixed | 1.00x |
| Glass | 1.20x |
| Metal | 1.50x |

Impact adds `1.25x` for at least 5 kg or 20 items and `1.50x` for at least 10 kg
or 50 items. The combined reward is capped at `0.05 CELO` per submission.

Rolling limits apply independently to the account and verified wallet:

- `0.10 CELO` per 24 hours.
- `0.35 CELO` per seven days.
- Final rewards of `0.03 CELO` or more require explicit administrator payout
  approval.

All amounts and category multipliers are server configuration. The saved
payment record retains the policy version and exact calculation.

## Duplicate-payout prevention

The payout path uses several independent safeguards:

1. The claim ID is deterministically derived from the immutable submission ID.
2. The database has unique constraints for both claim ID and submission ID.
3. An atomic status update permits only one worker to move a claim into
   `processing`.
4. A saved transaction hash moves the claim to `broadcast`; retries return that
   record and never broadcast again while confirmation is pending.
5. Before broadcasting, the service checks the contract's `paidClaims` mapping.
6. `RewardTreasury.payReward` permanently rejects a claim ID after its first
   successful transfer.

The contract records the claim before sending CELO. A failed transfer reverts
the whole transaction, including that record.

## Payment states

`blocked`, `awaiting_manual_approval`, `pending`, `processing`, `broadcast`,
`confirmed`, `simulated`, `failed`, and `duplicate_prevented` make payout
decisions auditable.

Local development defaults to `simulated`. A simulated result exercises
calculation, limits, locking, and idempotency but does not send a transaction.
Live mode requires all of the following:

- A deployed `RewardTreasury` on Celo Sepolia.
- The contract address in `CELO_REWARD_CONTRACT_ADDRESS`.
- `CELO_REWARDS_ENABLED=true` and `CELO_REWARD_DRY_RUN=false`.
- A funded owner key supplied through the deployment secret
  `CELO_TREASURY_PRIVATE_KEY`.
- A user wallet address whose ownership has been verified.

The backend validates the configured chain ID and the RPC-reported chain before
broadcasting. The treasury key must never be committed to source control.

## Authenticated API

- `GET /api/v1/rewards/policy` returns the public pilot policy.
- `GET /api/v1/rewards/submissions/:id` is restricted to the submission owner
  or an administrator.
- `POST /api/v1/rewards/submissions/:id/claim` is administrator-only and creates
  or returns the one claim for an approved submission.
- `POST /api/v1/rewards/submissions/:id/pay` is administrator-only and safely
  returns an existing result when retried.

Approving evidence attempts to create its reward claim automatically. Missing
wallet verification or a reached cap creates a visible blocked claim instead of
silently paying.

Phase 7 adds the administrator payout queue, application-level emergency pause,
audit trail, and receipt reconciliation. See [Phase 7 Reward
Operations](PHASE_7_REWARD_OPERATIONS.md).

## Deployment

From `blockchain/`:

```powershell
npm install
npm test
$env:CELO_TREASURY_PRIVATE_KEY = "<deployment-secret>"
npm run deploy:celo-sepolia
```

Copy the printed contract address into the backend deployment secret/config.
Keep rewards disabled until the contract owner, wallet-verification flow,
treasury funding, and pilot monitoring have been reviewed. Phase 6 provides the
signed wallet-verification flow and member reward ledger; it still requires
supported-wallet pilot testing.
