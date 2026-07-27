# Privacy Retention and Deletion Procedure

## Retention schedule

- Unsubmitted temporary uploads: delete within 24 hours.
- Rejected or abandoned evidence and precise GPS: delete within 90 days after
  the appeal window closes.
- Approved evidence and precise GPS: retain for 365 days after final payment,
  then delete the images and reduce location to a non-identifying area.
- Account profile and session data: retain while active; revoke sessions
  immediately after a verified deletion request.
- Authentication, administration, moderation, and destructive-action audit
  events: retain for 400 days with access restricted to authorized operators.
- Reward calculation, claim, transaction, reconciliation, and fraud-prevention
  records: retain for seven years or the shorter period approved by applicable
  law.
- Backups: expire within 35 days; deletion propagates when backup generations
  expire. Emergency legal holds must name an owner, reason, scope, and expiry.

## Verified deletion workflow

1. Create a private case and verify account control without requesting a wallet
   seed phrase or private key.
2. Pause pending rewards and check for unresolved moderation, appeal, security,
   payout, tax, or legal-hold obligations.
3. Export requested data through a private time-limited channel.
4. Revoke refresh tokens and active sessions.
5. Anonymize username, email, phone, location, avatar, device, and denormalized
   community identifiers.
6. Delete private photos and precise GPS that are outside an active retention
   obligation; keep only hashes needed to prevent duplicate rewards.
7. Unlink the wallet when no payment is pending. Explain that public Celo
   transactions cannot be erased.
8. Record counts, operator, approval, exceptions, object versions, and
   completion time in the audit case without copying deleted content.
9. Confirm completion to the requester and allow backup expiry to complete.

No operator should directly delete production rows or S3 prefixes. A reviewed,
idempotent deletion job and dry-run report are required before automation is
enabled.
