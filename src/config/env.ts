// src/config/env.ts
export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/fusee_backend',
  },
  admin: {
    votingThreshold: parseInt(process.env.ADMIN_VOTING_THRESHOLD || '2', 10),
    minThreshold: parseInt(process.env.ADMIN_MIN_THRESHOLD || '1', 10),
    maxThreshold: parseInt(process.env.ADMIN_MAX_THRESHOLD || '10', 10),
    timeDelay: {
      enabled: process.env.ADMIN_TIME_DELAY_ENABLED === 'true',
      delaySeconds: parseInt(process.env.ADMIN_TIME_DELAY_SECONDS || '300', 10), // 5 minutes default
      minDelaySeconds: parseInt(process.env.ADMIN_MIN_DELAY_SECONDS || '60', 10), // 1 minute minimum
      maxDelaySeconds: parseInt(process.env.ADMIN_MAX_DELAY_SECONDS || '86400', 10), // 24 hours maximum
    },
    inactivity: {
      enabled: process.env.ADMIN_INACTIVITY_CLEANUP_ENABLED === 'true',
      timeoutHours: parseInt(process.env.ADMIN_INACTIVITY_TIMEOUT_HOURS || '48', 10), // 48 hours default
      cleanupIntervalMinutes: parseInt(process.env.ADMIN_CLEANUP_INTERVAL_MINUTES || '60', 10), // Check every hour
    },
  },
  grid: {
    environment: (process.env.GRID_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    apiKey: process.env.GRID_API_KEY || '',
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    maxAge: parseInt(process.env.CORS_MAX_AGE || '86400', 10),
    enableLogging: process.env.ENABLE_CORS_LOGGING === 'true',
  },
};
