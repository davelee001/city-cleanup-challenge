# Phase 9 - Production Security Hardening

Phase 9 reduces the backend attack surface and adds explicit HTTP abuse
controls before a public deployment. It does not deploy infrastructure, change
production secrets, or enable Celo payouts.

## Runtime dependency hardening

- Upgraded Express, Sharp, SQLite, Viem, Morgan, Azure clients, and the backend
  development toolchain to current supported releases.
- Migrated optional S3 uploads from the end-of-support AWS SDK v2 to the modular
  AWS SDK v3.
- Removed the unused Application Insights service and its vulnerable
  OpenTelemetry dependency tree.
- Reduced the backend image to runtime source and dependencies and run it as a
  non-root user with dropped Linux capabilities.
- Added `npm run audit:prod`, which checks only packages shipped in the backend
  image, and enforced it in pull-request and CI checks.
- Verified zero known production dependency vulnerabilities on July 25, 2026.

The full development audit can still report advisories through upstream test
and lint globbing packages. Those packages are not installed by the production
Docker image. Do not use `npm audit fix --force` without reviewing its major
toolchain changes.

## HTTP protections

The API now:

- Sends Helmet security headers and removes the Express identification header.
- Applies a general API rate limit and a stricter shared authentication limit.
- Returns stable JSON `429` responses when a limit is exceeded.
- Limits JSON request bodies and returns a stable JSON `413` response.
- Trusts proxy forwarding headers only when an explicit hop count is set.
- Rejects invalid or extreme protection settings during startup.

Configuration defaults:

```env
API_RATE_LIMIT=100
AUTH_RATE_LIMIT=20
RATE_LIMIT_WINDOW_MS=900000
JSON_BODY_LIMIT_BYTES=1048576
TRUST_PROXY_HOPS=0
```

Production and Kubernetes use a proxy hop count of `1`. This must match the
actual ingress topology; an incorrect value can make IP-based limits
ineffective or allow forwarded-address spoofing.

## Evidence verification compatibility

Sharp 0.35 changed resize/recompression output enough to require recalibration
of the difference-hash distance. The threshold is now `12`, and new analyses
are recorded as `phase9-v2`. Exact SHA-256 duplicate rejection is unchanged.
Perceptual matches still go to manual review rather than automatic rejection.

The threshold must be calibrated again against a labeled pilot dataset before
automated decisions are broadened.

## Test isolation

Jest now uses an in-memory SQLite database and temporary evidence storage.
Repeated test runs no longer write users, submissions, fingerprints, or images
into the developer database.

## Remaining before public deployment

- Move persistence from SQLite to a shared production database before enabling
  multiple backend replicas.
- Put all production secrets in the selected managed secret store and rotate
  any credentials previously used outside it.
- Configure ingress TLS, request limits, network policy, and the exact trusted
  proxy hop count.
- Add a frontend content-security policy after auditing required Expo assets.
- Run authenticated dynamic security testing against staging.
- Review development-only audit findings whenever Jest, ESLint, or their
  transitive globbing dependencies publish fixes.
