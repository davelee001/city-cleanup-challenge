# Phase 3 - Cleanup Evidence Foundation

Phase 3 introduces the off-chain evidence workflow that must be trustworthy
before CELO rewards are connected. It implements the submission, exact duplicate,
manual review, and appeal foundations defined in
[Product Rules](PRODUCT_RULES.md).

## Implemented

- Authenticated before-and-after image submission.
- Camera capture timestamps and consented GPS coordinates with accuracy.
- Solid-waste category, item count or estimated weight, and optional notes.
- Server-side file-content validation for JPEG, PNG, and WebP.
- SHA-256 hashes for exact duplicate detection across all submissions.
- Automatic rejection of exact duplicates, including identical before/after
  images in one submission.
- Private evidence storage outside the public static image directory.
- Owner/admin authorization on submission records and evidence images.
- Persistent SQLite and evidence storage under the mounted `/app/data` volume.
- Immutable transition history from submission through automated and manual
  review.
- Administrator approval/rejection with required reasons and self-review
  prevention.
- One-time user appeal that returns a rejected submission to manual review.
- Authenticated before/after previews and status history in the frontend.

## Current State Flow

```text
draft
  -> submitted
  -> automated_review
     -> rejected (exact duplicate)
     -> manual_review (remaining verification is pending)
        -> approved
        -> rejected

rejected
  -> appealed
  -> manual_review
```

Phase 3 deliberately sends non-duplicate evidence to manual review. Automatic
approval is unsafe until perceptual matching, synthetic-image risk scoring,
scene consistency, and pilot thresholds are validated.

## API

All endpoints require a JWT access token.

- `POST /api/v1/evidence/submissions` — Submit multipart before/after evidence.
- `GET /api/v1/evidence/submissions` — List owned submissions; admins see the
  review queue.
- `GET /api/v1/evidence/submissions/:id` — Get an authorized submission and its
  transition history.
- `GET /api/v1/evidence/submissions/:id/images/:kind` — Stream a private
  `before` or `after` image to its owner or an admin.
- `POST /api/v1/evidence/submissions/:id/appeal` — Submit the owner's one-time
  appeal.
- `PATCH /api/v1/evidence/submissions/:id/review` — Approve or reject as an
  administrator.

## Deferred to the Next Verification Iteration

- Perceptual hashes for resized, cropped, and recompressed images.
- Scene-consistency and manipulation signals.
- Synthetic-image risk scoring.
- Device, velocity, account, and wallet risk signals.
- A dedicated reviewer role separate from administrator.
- Expiring object-storage URLs and production cloud storage.
- Configurable review thresholds and appeal deadlines.
- Reward calculation and CELO testnet payment.

No approved Phase 3 submission triggers a payment yet. Blockchain integration
must consume the immutable submission ID and preserve exactly-once payout
semantics in a later phase.
