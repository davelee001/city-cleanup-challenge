/**
 * Application Performance Monitoring (APM) Service
 * Integrates with Azure Application Insights or New Relic
 */

const appInsights = require('applicationinsights');

class APMService {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  /**
   * Initialize Application Insights
   */
  initialize() {
    const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    const instrumentationKey = process.env.APPINSIGHTS_INSTRUMENTATIONKEY;

    if (!connectionString && !instrumentationKey) {
      console.warn('Application Insights not configured. APM disabled.');
      return false;
    }

    try {
      appInsights.setup(connectionString || instrumentationKey)
        .setAutoDependencyCorrelation(true)
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true, true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectConsole(true, true)
        .setUseDiskRetryCaching(true)
        .setSendLiveMetrics(true)
        .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C);

      // Set cloud role name
      appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = 
        'city-cleanup-backend';

      appInsights.start();

      this.client = appInsights.defaultClient;
      this.initialized = true;

      console.log('Application Insights initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Application Insights:', error);
      return false;
    }
  }

  /**
   * Track custom event
   */
  trackEvent(name, properties = {}, measurements = {}) {
    if (!this.initialized) return;

    this.client.trackEvent({
      name,
      properties,
      measurements,
    });
  }

  /**
   * Track custom metric
   */
  trackMetric(name, value, properties = {}) {
    if (!this.initialized) return;

    this.client.trackMetric({
      name,
      value,
      properties,
    });
  }

  /**
   * Track dependency (external calls)
   */
  trackDependency(name, commandName, duration, success, dependencyTypeName = 'HTTP') {
    if (!this.initialized) return;

    this.client.trackDependency({
      target: name,
      name: commandName,
      data: commandName,
      duration,
      resultCode: success ? 200 : 500,
      success,
      dependencyTypeName,
    });
  }

  /**
   * Track exception
   */
  trackException(exception, properties = {}) {
    if (!this.initialized) return;

    this.client.trackException({
      exception,
      properties,
    });
  }

  /**
   * Track trace/log
   */
  trackTrace(message, severityLevel = 1, properties = {}) {
    if (!this.initialized) return;

    this.client.trackTrace({
      message,
      severity: severityLevel, // 0=Verbose, 1=Information, 2=Warning, 3=Error, 4=Critical
      properties,
    });
  }

  /**
   * Track page view (for frontend integration)
   */
  trackPageView(name, url, duration, properties = {}) {
    if (!this.initialized) return;

    this.client.trackPageView({
      name,
      url,
      duration,
      properties,
    });
  }

  /**
   * Track request
   */
  trackRequest(req, res, duration) {
    if (!this.initialized) return;

    this.client.trackRequest({
      name: `${req.method} ${req.path}`,
      url: req.url,
      duration,
      resultCode: res.statusCode,
      success: res.statusCode < 400,
      properties: {
        method: req.method,
        path: req.path,
        userAgent: req.get('user-agent'),
      },
    });
  }

  /**
   * Flush telemetry
   */
  async flush() {
    if (!this.initialized) return;

    return new Promise((resolve) => {
      this.client.flush({
        callback: () => resolve(),
      });
    });
  }

  /**
   * Express middleware for automatic request tracking
   */
  requestMiddleware() {
    return (req, res, next) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        this.trackRequest(req, res, duration);
      });

      next();
    };
  }

  /**
   * Track business metrics
   */
  trackBusinessMetric(metricName, value, dimensions = {}) {
    this.trackMetric(metricName, value, {
      metricType: 'business',
      ...dimensions,
    });
  }

  /**
   * Track user action
   */
  trackUserAction(action, userId, properties = {}) {
    this.trackEvent('UserAction', {
      action,
      userId,
      ...properties,
    });
  }

  /**
   * Set user context
   */
  setUser(userId, accountId = null) {
    if (!this.initialized) return;

    this.client.context.tags[this.client.context.keys.userId] = userId;
    if (accountId) {
      this.client.context.tags[this.client.context.keys.userAccountId] = accountId;
    }
  }

  /**
   * Set custom properties
   */
  setCommonProperties(properties) {
    if (!this.initialized) return;

    this.client.commonProperties = {
      ...this.client.commonProperties,
      ...properties,
    };
  }
}

// Export singleton instance
const apmService = new APMService();
module.exports = apmService;
