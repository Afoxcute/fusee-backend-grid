// src/app.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import Logger from './utils/logger';
import { config } from './config/env';

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

// Basic route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Add after basic routes
import userRoutes from './routes/user.routes';
app.use('/api/users', userRoutes);

// Error handling (place last)
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  Logger.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app;
