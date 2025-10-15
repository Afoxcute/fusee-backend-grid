// src/server.ts
import app from './app';
import { config } from './config/env';
import Logger from './utils/logger';
import { startRetryService } from './services/retry.service';
import { adminCleanupService } from './services/admin-cleanup.service';

const startServer = () => {
  const server = app.listen(config.port, () => {
    Logger.info(`🚀 Server running on port ${config.port} in ${config.nodeEnv} mode`);
    
    // Start the retry service
    startRetryService();
    
    // Start the admin cleanup service
    adminCleanupService.start();
  });

  // Handle graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  signals.forEach((signal) => {
    process.on(signal, () => {
      Logger.info(`Received ${signal}, shutting down gracefully`);
      
      // Stop admin cleanup service
      adminCleanupService.stop();
      
      server.close(() => {
        Logger.info('Server closed');
        process.exit(0);
      });
    });
  });
};

startServer();
