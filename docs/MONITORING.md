# Monitoring and Error Reporting

The local monitoring profile contains Prometheus, Alertmanager, Grafana, Loki,
and node-exporter. Every browser-facing port binds only to `127.0.0.1`.
Production monitoring must remain on a private network and be reached through a
VPN, bastion, or authenticated internal ingress.

## Render private configuration

Copy `monitoring/.env.example` to a secret environment source outside Git and
set real SMTP, team, on-call, Slack, Grafana, PostgreSQL, and metrics values.
Render Alertmanager and the Prometheus bearer-token file:

```powershell
npm run monitoring:render
docker compose --profile monitoring config
docker compose --profile monitoring up -d
```

The renderer refuses missing receivers, non-HTTPS Slack webhooks, and metrics
tokens shorter than 32 characters. Generated files live in the ignored
`rendered-monitoring` directory. Grafana has no default password: both
`GRAFANA_ADMIN_USER` and `GRAFANA_ADMIN_PASSWORD` are required by Compose.

Prometheus sends:

- critical alerts to the on-call email address and critical Slack channel;
- warning alerts to the team email address and warning Slack channel;
- informational alerts to the team email address.

Before production, fire one controlled alert at each severity and record the
Alertmanager delivery status plus receiver acknowledgement. Do not consider the
integration complete until a real person receives and acknowledges the critical
test.

## Sentry

Set these values in Key Vault and the deployment environment:

```env
SENTRY_ENABLED=true
SENTRY_DSN=https://public-key@your-sentry-host/project-id
SENTRY_ENVIRONMENT=staging
SENTRY_RELEASE=<git-commit-sha>
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0
```

Startup rejects a missing or non-HTTPS DSN in production when Sentry is enabled.
The SDK removes authorization, cookie, API-key, request-body, and email data
before sending an event. Validate the real integration by generating a
controlled staging exception, locating it by release SHA, and confirming that
no credential or request body appears in Sentry.

## Metrics access

Prometheus reads `METRICS_TOKEN` from the rendered bearer-token file. The backend
must receive the same token through Key Vault. Anonymous requests to
`/api/metrics` must return 401 or 403; the staging smoke test enforces this.

Important application metrics include request latency and error counters,
reward payment states, payout pause state, old broadcasts, CELO preflight
status, and treasury balance. Alert rules are in
`monitoring/prometheus/alerts/api_alerts.yml`.

## Operational checks

- Confirm every Prometheus target is healthy.
- Confirm Prometheus can scrape the protected backend metrics endpoint.
- Confirm Grafana rejects the old `admin/admin` credentials.
- Confirm monitoring ports are unreachable from the public internet.
- Confirm critical and warning alerts reach real receivers.
- Confirm a Sentry test error has the expected environment and release.
- Rotate SMTP, Slack, Grafana, and metrics credentials and repeat the checks.

Promtail has reached end of life and is not part of this hardened monitoring
profile. Use the platform's supported log collector before relying on Loki for
production log retention.
