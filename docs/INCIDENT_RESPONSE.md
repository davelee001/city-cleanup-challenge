# Incident Response Runbook

## Severity

- SEV-1: active private-key, payout, authentication, personal-data, or
  production-control compromise.
- SEV-2: significant availability loss, failed restore, monitoring failure, or
  suspected limited data exposure.
- SEV-3: contained defect or policy breach without confirmed sensitive impact.

## Response

1. Open a private incident record; assign incident commander, operations,
   security, communications, and scribe roles.
2. Preserve request IDs, audit events, deployment revisions, transaction hashes,
   and relevant logs. Do not copy secrets or private evidence into chat.
3. Contain: pause application and contract rewards, revoke sessions, rotate
   affected credentials, restrict traffic, and isolate compromised workloads.
4. Determine affected users, submissions, objects, wallets, transactions,
   regions, and time range.
5. Recover using an immutable known-good image and the tested database/evidence
   restore procedure. Reconcile every broadcast reward before resuming payouts.
6. Notify the project owner, on-call receiver, providers, users, regulators, or
   law enforcement when required by the applicable launch jurisdiction.
7. Restore traffic before rewards; monitor errors, audit events, payout state,
   and treasury balance.
8. Publish an approved post-incident review with timeline, root cause,
   contributing controls, corrective owners, deadlines, and recurrence tests.

SEV-1 acknowledgment target is 30 minutes. Conduct credential-compromise,
duplicate-payout, database-restore, and failed-deployment exercises before the
pilot and at least quarterly.
