// src/server.ts
import app from './app';
import { config } from './config/env';
import Logger from './utils/logger';

const startServer = () => {
  const server = app.listen(config.port, () => {
    Logger.info(`🚀 Server running on port ${config.port} in ${config.nodeEnv} mode`);
  });

  // Handle graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, () => {
      Logger.info(`Received ${signal}, shutting down gracefully`);
      server.close(() => {
        Logger.info('Server closed');
        process.exit(0);
      });
    });
  });
};

startServer();
