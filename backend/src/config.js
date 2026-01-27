/**
 * Environment Configuration Module
 * Loads and validates environment variables
 */

require('dotenv').config();

const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3001,
  host: process.env.HOST || 'localhost',

  // Database
  database: {
    path: process.env.DATABASE_PATH || './data/city-cleanup.db',
    url: process.env.DATABASE_URL,
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:19006'],
  },

  // API
  api: {
    version: process.env.API_VERSION || 'v1',
    rateLimit: parseInt(process.env.API_RATE_LIMIT, 10) || 100,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // Session
  session: {
    secret: process.env.SESSION_SECRET || 'dev-session-secret',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },

  // External APIs
  apis: {
    maps: process.env.MAPS_API_KEY,
    weather: process.env.WEATHER_API_KEY,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
  },

  // Azure
  azure: {
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    tenantId: process.env.AZURE_TENANT_ID,
    keyVaultUrl: process.env.AZURE_KEY_VAULT_URL,
  },

  // Email
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'noreply@citycleanup.com',
  },

  // Feature Flags
  features: {
    analytics: process.env.ENABLE_ANALYTICS === 'true',
    notifications: process.env.ENABLE_NOTIFICATIONS === 'true',
    cache: process.env.ENABLE_CACHE === 'true',
  },

  // Development
  dev: {
    debug: process.env.DEBUG,
    mockData: process.env.MOCK_DATA === 'true',
  },
};

// Validation
const requiredEnvVars = ['NODE_ENV'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0 && config.env === 'production') {
  console.error('Missing required environment variables:', missingVars);
  // Don't exit in development for flexibility
  if (config.env === 'production') {
    process.exit(1);
  }
}

module.exports = config;
