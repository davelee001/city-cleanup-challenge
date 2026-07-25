# Phase 7 - Reward Operations and Reconciliation

Phase 7 adds the operational controls required before a controlled Celo Sepolia
payout pilot. It does not deploy the contract or enable live transfers.

## Safe-by-default controls

The database creates the reward control in a paused state. A payout now requires
all three controls to allow it:

1. The database reward switch is active.
2. `CELO_REWARDS_ENABLED` is `true`.
3. Dry-run mode is disabled and the treasury contract and owner key are
   configured.

An administrator must provide a reason when pausing payouts. Pause and resume
changes record the administrator, time, previous state, and reason. The
application pause stops new broadcasts but does not hide or alter previously
broadcast transactions.

## Payout queue

The administrator queue prioritizes:

1. Broadcast transactions requiring reconciliation.
2. Processing records.
3. Rewards awaiting manual approval.
4. Pending rewards.
5. Failed attempts that may be safely retried.

The queue exposes the user, submission, waste category, calculated CELO amount,
wallet, transaction hash, attempts, failure details, and current status. Filters
allow administrators to focus on one state without changing the underlying
ledger.

## Transaction reconciliation

A transaction hash is saved immediately after broadcast. If the process
restarts or receipt waiting times out, the payment remains `broadcast` and is
never sent again.

Reconciliation queries the public Celo Sepolia receipt:

- No receipt keeps the payment in `broadcast`.
- A successful receipt waits for the configured confirmation count before
  marking the payment `confirmed`.
- A reverted receipt becomes `failed` only when the claim was not paid.
- If another transaction already paid the claim, the record becomes
  `duplicate_prevented`.

This closes the operational gap between transaction broadcast and final
confirmation without weakening duplicate-payout protection.

## Audit trail

The immutable reward audit table records:

- Pause and resume operations.
- Claim creation or retrieval.
- Simulated payments.
- Transaction broadcasts and broadcast failures.
- Confirmation and reconciliation outcomes.
- Duplicate prevention decisions.

Audit failures never change a payment result or cause an already-broadcast
transaction to be resent.

## Administrator API

All routes require an administrator access token:

- `GET /api/v1/rewards/admin/summary`
- `GET /api/v1/rewards/admin/payments?status=all`
- `PUT /api/v1/rewards/admin/controls`
- `POST /api/v1/rewards/admin/payments/:id/reconcile`

The existing administrator claim and payment routes now write audit entries and
enforce the database pause before any broadcast.

## Operations workspace

Administrators receive a dedicated **Reward operations** tool showing:

- Active and completed CELO totals.
- Manual-approval and broadcast counts.
- Simulation/live gateway readiness.
- Emergency pause state and reason.
- Filtered payout queue with safe payment and reconciliation actions.
- Recent administrator and system audit activity.

## Remaining before a live pilot

- Deploy and verify `RewardTreasury` on Celo Sepolia.
- Transfer contract ownership to the approved testnet treasury owner.
- Fund the owner account with testnet CELO.
- Store the key in the selected secrets manager.
- Configure the contract address and production verification domain.
- Run a staged low-value payout, restart, reconciliation, pause, and duplicate
  retry exercise.
- Run and preserve the Phase 8 read-only preflight.
- Validate stuck-broadcast, failure, preflight, and low-balance alerts with the
  pilot operators.

See [Phase 8 Celo Pilot Readiness](PHASE_8_CELO_PILOT_READINESS.md) for the
implemented checks and controlled pilot sequence.
