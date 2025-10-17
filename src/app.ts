// src/app.ts
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import cors from 'cors';
import Logger from './utils/logger';
import { config } from './config/env';
import swaggerSpec from './config/swagger';

const app = express();

// Basic middleware
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: [
    'X-Total-Count'
  ],
  maxAge: config.cors.maxAge,
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Swagger documentation
/**
 * @swagger
 * /api-docs:
 *   get:
 *     summary: API Documentation
 *     description: |
 *       Interactive API documentation powered by Swagger UI. This endpoint provides comprehensive documentation for all API endpoints.
 *       
 *       **Available Documentation:**
 *       - Complete API reference
 *       - Request/response schemas
 *       - Error handling details
 *       - Interactive testing interface
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: Swagger UI documentation page
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: HTML page with Swagger UI
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: |
 *       Returns the current status of the API server with comprehensive system information.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy and operational
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             examples:
 *               healthy:
 *                 summary: Healthy server response
 *                 value:
 *                   status: "OK"
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *                   uptime: 3600
 *                   environment: "development"
 *                   version: "1.0.0"
 *       500:
 *         description: Server is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
import userRoutes from './routes/user.routes';
import authRoutes from './routes/auth.routes';

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req, res) => {
  Logger.warn(`404 Not Found: ${req.originalUrl}`);
  res.status(404).json({ error: 'Not Found' });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  Logger.error(`Error: ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}\nStack: ${err.stack}`);
  
  res.status(500).json({
    error: 'Something went wrong!',
    // Only send stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default app;
