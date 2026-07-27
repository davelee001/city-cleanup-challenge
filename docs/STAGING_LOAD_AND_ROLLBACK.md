# Staging, Load, and Rollback Operations

This runbook is the release gate between a green build and a public deployment.
Never enable real CELO payouts during an infrastructure rehearsal.

## Environment setup

Create separate GitHub `staging` and `production` environments. Each environment
must provide:

- `PUBLIC_APP_URL` and `PUBLIC_API_URL`, including `https://`;
- `PUBLIC_APP_HOST` and `PUBLIC_API_HOST`, without schemes or paths;
- `TLS_CONTACT_EMAIL`;
- `AZURE_WORKLOAD_IDENTITY_CLIENT_ID`, `AZURE_KEY_VAULT_NAME`, and
  `AZURE_TENANT_ID`;
- `EVIDENCE_S3_BUCKET` and `AWS_REGION`;
- `AZURE_CREDENTIALS` as an environment secret.

Keep staging and production databases, buckets, namespaces, identity, and Key
Vault secrets separate. Configure the production environment with an approver
who is not the author of the release.

## Automated release gate

On a merge to `main`, the workflow:

1. runs lint, coverage, frontend build, SQLite tests, and PostgreSQL tests;
2. builds one immutable backend image and one immutable frontend image;
3. emits SBOM and provenance attestations;
4. blocks high or critical fixed vulnerabilities in either final image;
5. deploys the exact images to `city-cleanup-staging`;
6. waits for both rolling deployments and runs the smoke test;
7. exposes the same images to the protected production approval gate;
8. rolls back a failed rollout or smoke test.

The manifest render step refuses missing environment values, placeholders,
mutable `latest` tags, wildcard CORS, or absent baseline pod security settings.

## Manual staging checks

Run the read-only cluster check:

```powershell
.\scripts\kubernetes-preflight.ps1 -Namespace city-cleanup-staging
```

Run the smoke test:

```powershell
$env:SMOKE_BASE_URL = "https://staging.example.org"
$env:SMOKE_API_URL = "https://api.staging.example.org"
npm run staging:smoke
```

It verifies frontend and API health, database readiness, anonymous rejection on
a private route, metrics protection, the trusted TLS certificate and expiry,
and both allowed and denied CORS origins.

Run a real private upload and retrieval check with approved synthetic images:

```powershell
$env:STAGING_API_URL = "https://api.staging.example.org"
$env:STAGING_TEST_USERNAME = "<dedicated-test-user>"
$env:STAGING_TEST_PASSWORD = "<secret>"
$env:STAGING_BEFORE_IMAGE = "C:\fixtures\before.jpg"
$env:STAGING_AFTER_IMAGE = "C:\fixtures\after.jpg"
$env:STAGING_UPLOAD_CONFIRM = "CREATE_STAGING_EVIDENCE"
npm run staging:upload
```

The upload check accepts JPEG, PNG, or WebP fixtures, creates a durable staging
submission, and verifies that both images can be retrieved only with the user's
access token. Remove the drill record through the normal moderated retention
workflow; do not edit storage directly.

## Controlled load test

Start with the read-only readiness endpoint. The runner caps duration at ten
minutes and concurrency at 200 workers, and refuses state-changing paths.

```powershell
$env:LOAD_URL = "https://api.staging.example.org/ready"
$env:LOAD_DURATION_SECONDS = "60"
$env:LOAD_CONCURRENCY = "20"
$env:LOAD_MAX_P95_MS = "750"
$env:LOAD_MAX_ERROR_RATE = "0.01"
npm run staging:load
```

Record request count, requests per second, error rate, and p50/p95/p99 latency
in the release ticket. Increase traffic gradually and stop if database
connections, memory, error rate, or p95 latency cross their alert thresholds.
Upload and image-processing load requires approved synthetic fixtures and a
dedicated staging user; do not point that traffic at production.
Use the bounded `npm run staging:upload-load` procedure in
`docs/PHASE_16_PRODUCT_DEVICE.md`; it requires unique fixture pairs and records
every created submission ID.

## Rollback drill

Before the first public release and quarterly thereafter:

1. record current image references and deployment revision numbers;
2. deploy a harmless staging revision;
3. verify health and smoke-test results;
4. run `kubectl rollout undo deployment/backend -n city-cleanup-staging` and
   the equivalent frontend command;
5. wait for both rollouts and rerun the smoke test;
6. confirm database migration compatibility with the restored application;
7. record times, revision identifiers, operator, and outcome.

If production smoke tests fail, the workflow runs the same deployment rollback.
If a migration is not backward-compatible, stop before deployment and restore
the database using `docs/DATABASE_AND_EVIDENCE_OPERATIONS.md`; never improvise a
destructive rollback.

The controlled staging helper exercises a new rollout, rollback to the recorded
images, and HPA metrics:

```powershell
$env:STAGING_DRILL_CONFIRM = "RUN_STAGING_ROLLOUT_AND_ROLLBACK_DRILL"
.\scripts\staging-kubernetes-drill.ps1 -Namespace city-cleanup-staging -Execute
```

After starting the read-only API load test in another terminal, repeat with
`-RequireScaleUp -ScaleTarget backend-hpa` to require evidence that the backend
HPA actually added a replica. Store pre/post replica counts, rollout revisions,
image digests, and timestamps with the release evidence.

## Go/no-go record

Approve production only when:

- CI, PostgreSQL, image scans, staging rollout, smoke test, and load target pass;
- backup restore and rollback drills have current evidence;
- alerts reach a real on-call receiver;
- placeholders are replaced and TLS is issued;
- CELO payouts remain paused until the separately approved pilot procedure.
