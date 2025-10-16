// src/config/env.ts
export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/fusee_backend',
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
