/**
 * Uptime Monitoring Service
 * Health check endpoints and monitoring configuration
 */

const os = require('os');
const process = require('process');

class UptimeMonitor {
  constructor() {
    this.startTime = Date.now();
    this.healthChecks = new Map();
  }

  /**
   * Register a health check
   */
  registerHealthCheck(name, checkFunction) {
    this.healthChecks.set(name, checkFunction);
  }

  /**
   * Get system health
   */
  async getSystemHealth() {
    const uptime = process.uptime();
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptime,
        formatted: `${uptimeHours}h ${uptimeMinutes}m`,
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        memoryUsage: process.memoryUsage(),
        loadAverage: os.loadavg(),
      },
      process: {
        pid: process.pid,
        ppid: process.ppid,
        execPath: process.execPath,
        cwd: process.cwd(),
        env: process.env.NODE_ENV,
      },
    };
  }

  /**
   * Run all health checks
   */
  async runHealthChecks() {
    const results = {};
    let overallStatus = 'healthy';

    for (const [name, checkFn] of this.healthChecks.entries()) {
      try {
        const result = await checkFn();
        results[name] = {
          status: result.healthy ? 'healthy' : 'unhealthy',
          ...result,
        };

        if (!result.healthy) {
          overallStatus = 'degraded';
        }
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message,
        };
        overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      checks: results,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Detailed health endpoint
   */
  async getDetailedHealth() {
    const [systemHealth, healthChecks] = await Promise.all([
      this.getSystemHealth(),
      this.runHealthChecks(),
    ]);

    return {
      ...systemHealth,
      healthChecks: healthChecks.checks,
      overallStatus: healthChecks.status,
    };
  }

  /**
   * Liveness probe (is app running?)
   */
  getLiveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe (can accept traffic?)
   */
  async getReadiness() {
    const healthChecks = await this.runHealthChecks();
    const isReady = healthChecks.status !== 'unhealthy';

    return {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: healthChecks.checks,
    };
  }

  /**
   * Startup probe (has app finished starting?)
   */
  getStartup() {
    const uptimeSeconds = process.uptime();
    const isStarted = uptimeSeconds > 5; // Consider started after 5 seconds

    return {
      status: isStarted ? 'started' : 'starting',
      uptime: uptimeSeconds,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get metrics for external monitoring
   */
  getMetrics() {
    const memUsage = process.memoryUsage();
    
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
      },
      cpu: {
        user: process.cpuUsage().user,
        system: process.cpuUsage().system,
      },
      eventLoop: {
        delay: 0, // Will be populated by monitoring
      },
    };
  }
}

// Default health checks

/**
 * Database health check
 */
function createDatabaseHealthCheck(db) {
  return async () => {
    try {
      // Simple query to check database connectivity
      await new Promise((resolve, reject) => {
        db.get('SELECT 1', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return {
        healthy: true,
        responseTime: 0,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  };
}

/**
 * Memory health check
 */
function createMemoryHealthCheck(threshold = 0.9) {
  return async () => {
    const memUsage = process.memoryUsage();
    const heapUsedPercent = memUsage.heapUsed / memUsage.heapTotal;
    
    return {
      healthy: heapUsedPercent < threshold,
      heapUsedPercent: (heapUsedPercent * 100).toFixed(2),
      heapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMB: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
    };
  };
}

/**
 * Disk space health check
 */
function createDiskHealthCheck() {
  return async () => {
    try {
      const { execSync } = require('child_process');
      const isWindows = process.platform === 'win32';
      
      // This is a simple check - in production use a proper disk space library
      return {
        healthy: true,
        note: 'Disk check not implemented',
      };
    } catch (error) {
      return {
        healthy: true,
        note: 'Disk check skipped',
      };
    }
  };
}

// Export
const uptimeMonitor = new UptimeMonitor();

// Register default health checks
uptimeMonitor.registerHealthCheck('memory', createMemoryHealthCheck());
uptimeMonitor.registerHealthCheck('disk', createDiskHealthCheck());

module.exports = {
  uptimeMonitor,
  createDatabaseHealthCheck,
  createMemoryHealthCheck,
  createDiskHealthCheck,
};
