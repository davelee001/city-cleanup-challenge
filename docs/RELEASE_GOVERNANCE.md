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
- `PUBLIC_APP_URL` and `PUBLIC_API_URL` environment variables for smoke tests;
- short-lived Azure authentication where available;
- ACR and Azure credentials stored only as environment secrets.

These controls are external GitHub settings and cannot be enforced by files in
the repository alone.

Inspect the current controls with a repository-administration token:

```powershell
$env:GITHUB_REPOSITORY = "davelee001/city-cleanup-challenge"
$env:GITHUB_ADMIN_TOKEN = "<fine-grained-administration-token>"
npm run github:governance
```

To apply the declared controls, also provide a trusted production reviewer
different from the repository owner, all `STAGING_*` and `PRODUCTION_*`
environment values listed in `docs/STAGING_LOAD_AND_ROLLBACK.md`, then run:

```powershell
$env:GITHUB_PRODUCTION_REVIEWER = "<trusted-reviewer>"
$env:GITHUB_GOVERNANCE_CONFIRM = "APPLY_CITY_CLEANUP_GITHUB_GOVERNANCE"
npm run github:governance -- --apply
```

The script configures required CI checks, code-owner review, administrator
enforcement, conversation resolution, linear history, force-push/deletion
blocking, protected-branch deployments, production self-review prevention, and
environment variables. Azure credentials and application secrets remain
environment secrets and are not written by this script.

## Release identity

Every image is published once as `sha-<full-git-commit>`. Production manifests
are rendered with those immutable tags. The release workflow does not publish
or deploy `latest`.

The immutable web image uses same-origin `/api/v1` routing. The ingress sends
that path to the backend, allowing the exact same frontend image to pass through
staging and production without baking either environment's hostname into the
bundle. Native builds still require their environment-specific absolute API URL.

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
