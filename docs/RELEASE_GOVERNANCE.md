# Release Governance

## Required repository settings

Configure the `main` branch ruleset to require:

- pull requests with at least one approval from a code owner;
- dismissal of stale approvals after new commits;
- successful `Tests, coverage, lint, and builds` and
  `PostgreSQL migration and API suite` checks;
- resolved review conversations;
- signed commits where the team can support them;
- no force pushes, deletion, or administrator bypass.

Configure the GitHub `production` environment with:

- at least one required reviewer who is not the change author;
- deployment limited to the protected `main` branch;
- `PUBLIC_APP_URL` and `PUBLIC_API_URL` environment variables;
- short-lived Azure authentication where available;
- ACR and Azure credentials stored only as environment secrets.

These controls are external GitHub settings and cannot be enforced by files in
the repository alone.

## Release identity

Every image is published once as `sha-<full-git-commit>`. Production manifests
are rendered with those immutable tags. The release workflow does not publish
or deploy `latest`.

Each image build emits provenance and an SBOM. Both final images must pass the
high and critical vulnerability gate before the protected production
environment can be approved.

## Approval sequence

1. Required CI and PostgreSQL checks pass on the pull request.
2. A code owner reviews production-sensitive files.
3. The protected branch merges the approved commit.
4. Immutable images are built and scanned.
5. A production environment reviewer verifies the change record and approves.
6. Kubernetes performs a zero-unavailable rollout.
7. The release smoke test runs.
8. A failed rollout or smoke test automatically restores the preceding
   deployment revision.

Record the image tags, approver, migration list, smoke-test result, and rollback
revision in the release ticket.
