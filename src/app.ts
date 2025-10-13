// src/app.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import Logger from './utils/logger';
import { config } from './config/env';
import { swaggerSpec } from './config/swagger';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  Logger.http(`${req.method} ${req.url}`);
  next();
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Basic route
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the current status of the API server
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Add after basic routes
import userRoutes from './routes/user.routes';
import postRoutes from './routes/post.routes';
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

// Error handling (place last)
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  Logger.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app;
