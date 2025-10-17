"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
// src/config/env.ts
exports.config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    database: {
        url: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/fusee_backend',
    },
    grid: {
        environment: process.env.GRID_ENVIRONMENT || 'sandbox',
        apiKey: process.env.GRID_API_KEY || '',
    },
    cors: {
        allowedOrigins: ((_a = process.env.ALLOWED_ORIGINS) === null || _a === void 0 ? void 0 : _a.split(',')) || ['http://localhost:3000'],
        maxAge: parseInt(process.env.CORS_MAX_AGE || '86400', 10),
        enableLogging: process.env.ENABLE_CORS_LOGGING === 'true',
    },
};
