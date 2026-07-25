# Phase 8 - Celo Pilot Readiness

Phase 8 makes the existing reward system observable and repeatable before a
controlled Celo Sepolia payout pilot. It does not deploy `RewardTreasury`,
enable payouts, reveal a private key, or send a blockchain transaction.

## Delivered safeguards

- Startup validation rejects unsafe live-reward configuration before the API
  accepts traffic.
- A read-only preflight checks the RPC chain, deployed contract bytecode,
  on-chain pause state, contract owner, configured signer, treasury balance,
  application payout pause, and runtime configuration.
- The preflight response and audit record exclude the treasury private key.
- Reward and preflight metrics are exposed for Prometheus.
- Alerts cover stuck broadcasts, failed payment records, unexpected confirmed
  reward volume, a failed preflight, and a treasury balance below the
  configured pilot minimum.
- Kubernetes remains at one backend replica while SQLite is in use.

## Startup validation

Production requires different JWT access and refresh secrets of at least 32
characters, an HTTPS wallet-verification URI, and a non-placeholder wallet
domain. Live Celo broadcasting additionally requires:

- `CELO_REWARDS_ENABLED=true`
- `CELO_REWARD_DRY_RUN=false`
- `CELO_CHAIN_ID=11142220`
- An HTTPS `CELO_RPC_URL`
- A valid `CELO_REWARD_CONTRACT_ADDRESS`
- A 32-byte `CELO_TREASURY_PRIVATE_KEY`
- `CELO_TREASURY_MIN_BALANCE` greater than zero

The public Celo Forno endpoint is suitable for development but has no uptime
SLA. A supported RPC provider should be selected for the pilot.

## Read-only preflight

Keep the persistent application payout control paused, then run either:

```bash
cd backend
npm run pilot:preflight
```

or, with an administrator access token against a running environment:

```bash
CITY_CLEANUP_API_URL=https://api.cleanup.example \
CITY_CLEANUP_ADMIN_TOKEN=replace-with-short-lived-token \
npm run pilot:smoke
```

The administrator endpoint is:

```text
POST /api/v1/rewards/admin/preflight
```

The command exits unsuccessfully until every check passes. A successful
preflight means the environment is prepared for an operator-controlled pilot;
it does not activate payouts.

## Prometheus metrics

`GET /api/metrics` exposes:

- `city_cleanup_reward_payments{status}`
- `city_cleanup_reward_payouts_paused`
- `city_cleanup_reward_oldest_broadcast_age_seconds`
- `city_cleanup_celo_preflight_ready`
- `city_cleanup_celo_preflight_last_run_timestamp_seconds`
- `city_cleanup_celo_treasury_balance`

Set `METRICS_ENABLED=false` to disable the endpoint. `METRICS_TOKEN` optionally
requires a bearer token; when it is blank, restrict the endpoint to the private
monitoring network.

## Controlled pilot sequence

1. Deploy and verify `RewardTreasury` on Celo Sepolia.
2. Transfer ownership to the dedicated pilot treasury signer.
3. Store its key in the selected secrets manager and fund it only with testnet
   CELO.
4. Configure the verified address, supported RPC, verification domain, and
   treasury minimum while keeping application payouts paused.
5. Run the read-only preflight and confirm Prometheus has scraped it.
6. Select one reviewed low-value claim and record the expected amount.
7. Briefly resume payouts, process only that claim, and pause payouts again.
8. Confirm the receipt, ledger, audit record, member history, and explorer link.
9. Restart the backend and reconcile the payment.
10. Retry the same claim and confirm both application and contract layers
    prevent a duplicate payout.
11. Exercise pause, stuck-broadcast, failed-payment, and low-balance alerts.

## Still required before the pilot

- Choose the pilot operator, approver, RPC provider, secrets manager, alert
  recipients, payout window, and rollback owner.
- Deploy and verify the contract; record its address and deployment transaction.
- Create and fund a dedicated Celo Sepolia treasury.
- Configure staging secrets outside Git.
- Resolve the production dependency audit, including the legacy SQLite build
  chain, image-processing, and observability dependencies, before public
  deployment.
- Run the controlled sequence above and preserve the evidence.
- Resolve any failed preflight or alert before enabling a wider pilot.
