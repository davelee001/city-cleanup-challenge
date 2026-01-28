# Monitoring Infrastructure Documentation

## Overview

Comprehensive monitoring stack for the City Cleanup Challenge application including:
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **Loki**: Log aggregation
- **Sentry**: Error tracking
- **Application Insights**: APM and performance monitoring
- **Uptime Monitoring**: Health checks and availability

## Quick Start

### Start All Monitoring Services

```bash
docker-compose --profile monitoring up -d
```

This starts:
- Prometheus (http://localhost:9090)
- Grafana (http://localhost:3000) - admin/admin
- Loki (http://localhost:3100)
- Promtail (log shipper)
- Alertmanager (http://localhost:9093)
- Node Exporter (system metrics)

### Access Dashboards

**Grafana**: http://localhost:3000
- Username: `admin`
- Password: `admin`
- Pre-configured dashboards in "City Cleanup Dashboards" folder

**Prometheus**: http://localhost:9090
- Query metrics directly
- View active alerts
- Check targets status

**Alertmanager**: http://localhost:9093
- View active alerts
- Manage silences

## Prometheus Metrics

### Available Metrics

**HTTP Metrics:**
- `city_cleanup_http_requests_total` - Total HTTP requests by method, route, status
- `city_cleanup_http_request_duration_seconds` - Request duration histogram
- `city_cleanup_http_request_errors_total` - HTTP errors by type

**Application Metrics:**
- `city_cleanup_active_connections` - Current active connections
- `city_cleanup_events_total` - Total cleanup events by status
- `city_cleanup_participants_total` - Participants per event

**System Metrics:**
- `process_cpu_seconds_total` - CPU usage
- `process_resident_memory_bytes` - Memory usage
- `nodejs_heap_size_total_bytes` - Node.js heap size
- `nodejs_eventloop_lag_seconds` - Event loop lag

### Custom Metrics

Add custom metrics in your code:

```javascript
const metricsService = require('./services/metrics');

// Track custom event
metricsService.trackEvent('completed', 'cleanup');

// Track database query
metricsService.trackDatabaseQuery('SELECT', 'events', 0.045);

// Track participants
metricsService.trackParticipants('event-123', 45);
```

### Querying Metrics

Example PromQL queries:

```promql
# Request rate
rate(city_cleanup_http_requests_total[5m])

# 95th percentile response time
histogram_quantile(0.95, rate(city_cleanup_http_request_duration_seconds_bucket[5m]))

# Error rate
rate(city_cleanup_http_request_errors_total[5m]) / rate(city_cleanup_http_requests_total[5m])

# Memory usage
process_resident_memory_bytes / 1024 / 1024
```

## Grafana Dashboards

### Pre-configured Dashboards

1. **API Metrics Dashboard**
   - Request rate
   - Response times (p50, p95, p99)
   - Error rates
   - Active connections
   - Memory usage

2. **Business Metrics Dashboard** (create your own)
   - Total events
   - Participants trends
   - Event completion rates
   - User engagement

### Creating Custom Dashboards

1. Open Grafana (http://localhost:3000)
2. Click "+" → "Dashboard"
3. Add panel
4. Select Prometheus datasource
5. Write PromQL query
6. Configure visualization

## Alerting

### Alert Rules

Located in `monitoring/prometheus/alerts/api_alerts.yml`

**Active Alerts:**
- High error rate (> 5%)
- High response time (p95 > 2s)
- High CPU usage (> 80%)
- High memory usage (> 512MB)
- Service down
- Database connection issues

### Alert Configuration

Edit `monitoring/prometheus/alerts/api_alerts.yml`:

```yaml
- alert: CustomAlert
  expr: your_metric > threshold
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Alert description"
    description: "Detailed description with {{ $value }}"
```

### Notification Channels

Configure in `monitoring/alertmanager/config.yml`:

**Email:**
```yaml
email_configs:
  - to: 'team@citycleanup.com'
```

**Slack:**
```yaml
slack_configs:
  - api_url: '${SLACK_WEBHOOK_URL}'
    channel: '#alerts'
```

**Webhook:**
```yaml
webhook_configs:
  - url: 'http://backend:3001/api/webhooks/alerts'
```

## Sentry Error Tracking

### Setup

1. Create Sentry account at https://sentry.io
2. Create new project
3. Get DSN from project settings
4. Add to environment:

```env
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

### Usage

Sentry automatically captures:
- Unhandled exceptions
- Promise rejections
- HTTP errors (>= 500)
- Performance traces

Manual capture:

```javascript
const sentryService = require('./services/sentry');

// Capture exception
sentryService.captureException(error, { context: 'additional data' });

// Capture message
sentryService.captureMessage('Something happened', 'warning');

// Set user context
sentryService.setUser({ id: '123', email: 'user@example.com' });

// Add breadcrumb
sentryService.addBreadcrumb({
  message: 'User action',
  category: 'action',
  level: 'info'
});
```

## Application Insights (APM)

### Setup

```bash
# Create Application Insights in Azure
az monitor app-insights component create \
  --app city-cleanup-insights \
  --location eastus \
  --resource-group city-cleanup-rg
```

Add to environment:

```env
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=xxx;...
```

### Features

- Automatic request tracking
- Dependency tracking (database, HTTP calls)
- Exception tracking
- Performance monitoring
- Live metrics
- Application map

### Custom Tracking

```javascript
const apmService = require('./services/apm');

// Track event
apmService.trackEvent('UserSignup', { plan: 'premium' });

// Track metric
apmService.trackMetric('QueueLength', 42);

// Track dependency
apmService.trackDependency('Redis', 'GET user:123', 45, true);

// Track business metric
apmService.trackBusinessMetric('EventsCreated', 1, { city: 'NYC' });
```

## Log Aggregation (Loki)

### Viewing Logs

1. Open Grafana
2. Go to "Explore"
3. Select "Loki" datasource
4. Query logs:

```logql
# All backend logs
{job="city-cleanup-backend"}

# Error logs only
{job="city-cleanup-backend"} |= "error"

# Logs from specific route
{job="city-cleanup-backend"} |~ "/api/events.*"

# JSON parsing
{job="city-cleanup-backend"} | json | level="error"
```

### Log Levels

Application uses Winston with levels:
- `error` - Errors and exceptions
- `warn` - Warnings
- `info` - General information
- `debug` - Debugging information

### Structured Logging

```javascript
const logger = require('./services/logging');

// Log with context
logger.info('User logged in', { userId: '123', ip: '1.2.3.4' });

// Log error
logger.error('Database connection failed', error, { query: 'SELECT...' });

// Log event
logger.logEvent('EventCreated', { eventId: '456', participants: 20 });
```

## Health Checks

### Endpoints

**Liveness**: `/api/health/live`
- Checks if application is running
- Returns 200 if alive

**Readiness**: `/api/health/ready`
- Checks if application can accept traffic
- Verifies database, dependencies
- Returns 200 if ready

**Detailed Health**: `/api/health`
- Complete health information
- System metrics
- All health checks
- Uptime information

### Kubernetes Health Probes

```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
```

### Custom Health Checks

```javascript
const { uptimeMonitor } = require('./services/uptime');

// Register custom health check
uptimeMonitor.registerHealthCheck('external-api', async () => {
  try {
    await fetch('https://api.example.com/health');
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
});
```

## Best Practices

### Metrics

1. **Use labels wisely** - Keep cardinality low
2. **Prefer counters and histograms** over gauges
3. **Name consistently** - Follow Prometheus naming conventions
4. **Sample appropriately** - Don't overload with metrics

### Logging

1. **Use structured logging** - JSON format
2. **Include context** - Request IDs, user IDs
3. **Appropriate levels** - Don't log everything as error
4. **Sensitive data** - Never log passwords, tokens

### Alerting

1. **Alert on symptoms** not causes
2. **Actionable alerts** - Must require action
3. **Clear descriptions** - Include context
4. **Test alerts** regularly

### Performance

1. **Sample traces** - Don't track every request
2. **Async operations** - Don't block on telemetry
3. **Buffer and batch** - Reduce network calls
4. **Cache when possible** - Reduce overhead

## Troubleshooting

### High Memory Usage

```promql
# Check memory trends
process_resident_memory_bytes

# Heap usage
nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes
```

### Slow Requests

```promql
# Slowest routes
topk(5, histogram_quantile(0.95, 
  rate(city_cleanup_http_request_duration_seconds_bucket[5m]))
)
```

### Error Spikes

```promql
# Error rate by route
sum by(route) (rate(city_cleanup_http_request_errors_total[5m]))
```

### Database Issues

Check logs:
```logql
{job="city-cleanup-backend"} |= "database" |= "error"
```

## Monitoring Checklist

- [ ] Prometheus scraping metrics
- [ ] Grafana dashboards configured
- [ ] Alerts configured and tested
- [ ] Sentry capturing errors
- [ ] Application Insights tracking performance
- [ ] Logs flowing to Loki
- [ ] Health checks working
- [ ] Notification channels tested
- [ ] Team access configured
- [ ] Documentation updated

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Sentry Documentation](https://docs.sentry.io/)
- [Application Insights](https://docs.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
- [Loki Documentation](https://grafana.com/docs/loki/)
