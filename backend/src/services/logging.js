/**
 * Logging Service
 * Centralized logging with multiple transports
 */

const winston = require('winston');
const { format } = winston;

class LoggingService {
  constructor() {
    this.logger = null;
    this.initialize();
  }

  /**
   * Initialize Winston logger
   */
  initialize() {
    const logFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.errors({ stack: true }),
      format.splat(),
      format.json()
    );

    const consoleFormat = format.combine(
      format.colorize(),
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
          msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
      })
    );

    const transports = [
      // Console transport
      new winston.transports.Console({
        format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
        level: process.env.LOG_LEVEL || 'info',
      }),

      // File transport for errors
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),

      // File transport for all logs
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ];

    // Add HTTP transport for centralized logging (e.g., Loki, Elasticsearch)
    if (process.env.LOG_ENDPOINT) {
      transports.push(
        new winston.transports.Http({
          host: process.env.LOG_HOST,
          port: process.env.LOG_PORT,
          path: process.env.LOG_PATH,
          format: logFormat,
        })
      );
    }

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: {
        service: 'city-cleanup-backend',
        environment: process.env.NODE_ENV || 'development',
      },
      transports,
      exitOnError: false,
    });

    // Handle uncaught exceptions and rejections
    this.logger.exceptions.handle(
      new winston.transports.File({
        filename: 'logs/exceptions.log',
        format: logFormat,
      })
    );

    this.logger.rejections.handle(
      new winston.transports.File({
        filename: 'logs/rejections.log',
        format: logFormat,
      })
    );
  }

  /**
   * Log info message
   */
  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  /**
   * Log error message
   */
  error(message, error = null, meta = {}) {
    if (error) {
      this.logger.error(message, {
        error: {
          message: error.message,
          stack: error.stack,
          ...error,
        },
        ...meta,
      });
    } else {
      this.logger.error(message, meta);
    }
  }

  /**
   * Log warning message
   */
  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  /**
   * Log debug message
   */
  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  /**
   * Log HTTP request
   */
  logRequest(req, res, responseTime) {
    this.logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });
  }

  /**
   * Log database query
   */
  logQuery(query, duration, error = null) {
    if (error) {
      this.logger.error('Database Query Failed', {
        query,
        duration: `${duration}ms`,
        error: error.message,
      });
    } else {
      this.logger.debug('Database Query', {
        query,
        duration: `${duration}ms`,
      });
    }
  }

  /**
   * Log business event
   */
  logEvent(eventType, data = {}) {
    this.logger.info('Business Event', {
      eventType,
      ...data,
    });
  }

  /**
   * Create child logger with additional metadata
   */
  child(metadata) {
    return this.logger.child(metadata);
  }

  /**
   * Express middleware for request logging
   */
  requestMiddleware() {
    return (req, res, next) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        this.logRequest(req, res, duration);
      });

      next();
    };
  }
}

// Export singleton instance
const loggingService = new LoggingService();
module.exports = loggingService;
