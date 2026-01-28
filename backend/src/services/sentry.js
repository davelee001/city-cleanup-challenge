/**
 * Sentry Error Tracking Integration
 * Captures and reports errors to Sentry
 */

const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

class SentryService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize Sentry
   */
  initialize(app) {
    const dsn = process.env.SENTRY_DSN;
    
    if (!dsn) {
      console.warn('Sentry DSN not configured. Error tracking disabled.');
      return false;
    }

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      
      // Release tracking
      release: process.env.APP_VERSION || 'unknown',
      
      // Performance monitoring
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      
      // Profiling
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
      integrations: [
        new ProfilingIntegration(),
      ],
      
      // Error filtering
      beforeSend(event, hint) {
        // Don't send certain errors
        if (event.exception) {
          const error = hint.originalException;
          
          // Filter out 404s
          if (error && error.status === 404) {
            return null;
          }
          
          // Filter out CORS errors in development
          if (process.env.NODE_ENV === 'development' && 
              error && error.message && error.message.includes('CORS')) {
            return null;
          }
        }
        
        return event;
      },
      
      // Breadcrumbs
      beforeBreadcrumb(breadcrumb) {
        // Filter sensitive data from breadcrumbs
        if (breadcrumb.category === 'http' && breadcrumb.data) {
          delete breadcrumb.data.authorization;
          delete breadcrumb.data.cookie;
        }
        return breadcrumb;
      },
    });

    // Request handler must be the first middleware
    if (app) {
      app.use(Sentry.Handlers.requestHandler());
      app.use(Sentry.Handlers.tracingHandler());
    }

    this.initialized = true;
    console.log('Sentry initialized successfully');
    return true;
  }

  /**
   * Error handler middleware (must be used after all routes)
   */
  errorHandler() {
    return Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Capture all errors with status >= 500
        if (error.status >= 500) {
          return true;
        }
        // Capture specific error types
        return error.isOperational === false;
      },
    });
  }

  /**
   * Capture exception
   */
  captureException(error, context = {}) {
    if (!this.initialized) {
      console.error('Sentry not initialized:', error);
      return;
    }

    Sentry.captureException(error, {
      extra: context,
    });
  }

  /**
   * Capture message
   */
  captureMessage(message, level = 'info', context = {}) {
    if (!this.initialized) {
      console.log(`[${level}] ${message}`, context);
      return;
    }

    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb) {
    if (!this.initialized) return;
    
    Sentry.addBreadcrumb(breadcrumb);
  }

  /**
   * Set user context
   */
  setUser(user) {
    if (!this.initialized) return;
    
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  }

  /**
   * Clear user context
   */
  clearUser() {
    if (!this.initialized) return;
    Sentry.setUser(null);
  }

  /**
   * Set custom context
   */
  setContext(key, data) {
    if (!this.initialized) return;
    Sentry.setContext(key, data);
  }

  /**
   * Set tags
   */
  setTags(tags) {
    if (!this.initialized) return;
    Sentry.setTags(tags);
  }

  /**
   * Start transaction for performance monitoring
   */
  startTransaction(name, op) {
    if (!this.initialized) return null;
    
    return Sentry.startTransaction({
      name,
      op,
    });
  }

  /**
   * Flush events and close connection
   */
  async close(timeout = 2000) {
    if (!this.initialized) return;
    
    await Sentry.close(timeout);
  }
}

// Export singleton instance
const sentryService = new SentryService();
module.exports = sentryService;
