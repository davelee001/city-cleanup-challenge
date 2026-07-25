# Phase 6 - Wallet Ownership and Reward Experience

Phase 6 gives each member a secure way to prove control of a Celo wallet and
see their reward history. The application never requests or stores wallet
private keys or seed phrases.

## Ownership verification

Wallet linking uses a one-time EIP-191 signed-message challenge:

1. An authenticated user submits a Celo address.
2. The server returns a unique challenge containing the account ID, wallet,
   Celo Sepolia chain ID, random nonce, issue time, and expiry time.
3. The wallet signs the exact message without submitting a transaction or
   paying gas.
4. The server recovers and verifies the signer before saving the wallet.
5. The challenge is consumed atomically and cannot be replayed.

Challenges expire after ten minutes by default. Creating a new challenge
invalidates previous unused challenges for that account. Challenge and verify
requests are rate limited.

## Account and payout safeguards

- One verified wallet can belong to only one active account.
- A wallet cannot be replaced or removed while a reward is pending, awaiting
  approval, processing, or broadcast.
- Previously confirmed payments keep their original recipient and audit record.
- Reward claims blocked only because a wallet was missing are recalculated and
  reactivated after successful verification.
- Account and wallet rolling payout caps are reapplied during reactivation.
- Signing a verification message never authorizes a payment or blockchain
  transaction.

## Member API

All endpoints require a valid access token:

- `GET /api/v1/wallet` returns the member's wallet verification status.
- `POST /api/v1/wallet/challenge` creates a one-time signing challenge.
- `POST /api/v1/wallet/verify` verifies the signature and links the wallet.
- `DELETE /api/v1/wallet` removes an idle wallet.
- `GET /api/v1/rewards/mine` returns the authenticated member's reward ledger.

The wallet endpoint derives the user ID from the access token. A client cannot
link or remove a wallet for another account.

## Frontend experience

The logged-in workspace now includes **Wallet & payouts**:

- Browser wallets can connect, add or switch to Celo Sepolia, sign, and verify
  in one guided flow.
- A manual signed-message path supports wallets without an injected browser
  provider.
- Members see wallet status, pilot payout limits, reward totals, claim states,
  and confirmed transaction links to the Celo Sepolia explorer.
- Testnet and signature safety guidance is visible throughout the flow.

Native WalletConnect/Reown support remains a deployment task because it requires
a project ID, deep-link configuration, and device testing. The manual
signed-message path remains available until that connector is configured.

## Deployment configuration

- `WALLET_VERIFICATION_DOMAIN` must match the public application domain.
- `WALLET_VERIFICATION_URI` must be the public HTTPS application URL.
- `WALLET_CHALLENGE_TTL_MS` defaults to `600000` milliseconds.
- Celo Sepolia remains chain ID `11142220`.

Before a public pilot, configure the production domain values, add the native
wallet connector, test the flow with supported wallets, and monitor challenge
failures and wallet-change attempts.
