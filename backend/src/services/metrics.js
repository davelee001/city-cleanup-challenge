/**
 * Prometheus Metrics Middleware
 * Collects and exposes metrics for monitoring
 */

const promClient = require('prom-client');

class PrometheusMetrics {
  constructor() {
    this.register = new promClient.Registry();
    
    // Add default metrics (CPU, memory, etc.)
    promClient.collectDefaultMetrics({
      register: this.register,
      prefix: 'city_cleanup_',
    });

    // Custom metrics
    this.httpRequestDuration = new promClient.Histogram({
      name: 'city_cleanup_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register],
    });

    this.httpRequestTotal = new promClient.Counter({
      name: 'city_cleanup_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.httpRequestErrors = new promClient.Counter({
      name: 'city_cleanup_http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [this.register],
    });

    this.activeConnections = new promClient.Gauge({
      name: 'city_cleanup_active_connections',
      help: 'Number of active connections',
      registers: [this.register],
    });

    this.databaseQueryDuration = new promClient.Histogram({
      name: 'city_cleanup_database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['query_type', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
      registers: [this.register],
    });

    this.eventMetrics = new promClient.Counter({
      name: 'city_cleanup_events_total',
      help: 'Total number of cleanup events',
      labelNames: ['status', 'type'],
      registers: [this.register],
    });

    this.participantMetrics = new promClient.Gauge({
      name: 'city_cleanup_participants_total',
      help: 'Total number of participants',
      labelNames: ['event_id'],
      registers: [this.register],
    });

    this.rewardPayments = new promClient.Gauge({
      name: 'city_cleanup_reward_payments',
      help: 'Current reward payment records by status',
      labelNames: ['status'],
      registers: [this.register],
    });

    this.rewardPaused = new promClient.Gauge({
      name: 'city_cleanup_reward_payouts_paused',
      help: 'Whether application-level reward payouts are paused',
      registers: [this.register],
    });

    this.oldestBroadcastAge = new promClient.Gauge({
      name: 'city_cleanup_reward_oldest_broadcast_age_seconds',
      help: 'Age in seconds of the oldest unconfirmed reward broadcast',
      registers: [this.register],
    });

    this.celoPreflightReady = new promClient.Gauge({
      name: 'city_cleanup_celo_preflight_ready',
      help: 'Whether the most recent Celo pilot preflight passed',
      registers: [this.register],
    });

    this.celoPreflightLastRun = new promClient.Gauge({
      name: 'city_cleanup_celo_preflight_last_run_timestamp_seconds',
      help: 'Unix timestamp of the most recent Celo pilot preflight',
      registers: [this.register],
    });

    this.celoTreasuryBalance = new promClient.Gauge({
      name: 'city_cleanup_celo_treasury_balance',
      help: 'Configured Celo treasury signer balance in CELO',
      registers: [this.register],
    });
  }

  /**
   * Express middleware to track HTTP requests
   */
  requestMiddleware() {
    return (req, res, next) => {
      const start = Date.now();
      
      this.activeConnections.inc();

      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route ? req.route.path : req.path;
        
        this.httpRequestDuration.observe(
          { method: req.method, route, status_code: res.statusCode },
          duration
        );

        this.httpRequestTotal.inc({
          method: req.method,
          route,
          status_code: res.statusCode,
        });

        this.activeConnections.dec();
      });

      next();
    };
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery(queryType, table, duration) {
    this.databaseQueryDuration.observe(
      { query_type: queryType, table },
      duration
    );
  }

  /**
   * Track events
   */
  trackEvent(status, type = 'cleanup') {
    this.eventMetrics.inc({ status, type });
  }

  /**
   * Track participants
   */
  trackParticipants(eventId, count) {
    this.participantMetrics.set({ event_id: eventId }, count);
  }

  /**
   * Track errors
   */
  trackError(method, route, errorType) {
    this.httpRequestErrors.inc({ method, route, error_type: errorType });
  }

  async refreshRewardMetrics(db) {
    const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
      db.all(sql, params, (error, rows) => {
        if (error) reject(error);
        else resolve(rows);
      });
    });
    const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
      db.get(sql, params, (error, row) => {
        if (error) reject(error);
        else resolve(row);
      });
    });
    const [statuses, controls, oldest] = await Promise.all([
      dbAll('SELECT status, COUNT(*) AS total FROM reward_payments GROUP BY status'),
      dbGet('SELECT paused FROM reward_controls WHERE id = 1'),
      dbGet(
        `SELECT broadcast_at FROM reward_payments
         WHERE status = 'broadcast' AND broadcast_at IS NOT NULL
         ORDER BY broadcast_at ASC LIMIT 1`
      ),
    ]);
    this.rewardPayments.reset();
    statuses.forEach((row) => this.rewardPayments.set({ status: row.status }, row.total));
    this.rewardPaused.set(controls ? (controls.paused ? 1 : 0) : 1);
    const broadcastAge = oldest?.broadcast_at
      ? Math.max(0, (Date.now() - new Date(`${oldest.broadcast_at.replace(' ', 'T')}Z`).getTime()) / 1000)
      : 0;
    this.oldestBroadcastAge.set(Number.isFinite(broadcastAge) ? broadcastAge : 0);
  }

  updateCeloPreflight(preflight) {
    this.celoPreflightReady.set(preflight?.ready ? 1 : 0);
    this.celoPreflightLastRun.set(Date.now() / 1000);
    const balance = Number(preflight?.deployment?.signer?.balanceCelo);
    if (Number.isFinite(balance)) this.celoTreasuryBalance.set(balance);
  }

  /**
   * Get metrics endpoint handler
   */
  async getMetrics() {
    return await this.register.metrics();
  }

  /**
   * Get content type
   */
  getContentType() {
    return this.register.contentType;
  }
}

// Export singleton instance
const metricsService = new PrometheusMetrics();
module.exports = metricsService;
