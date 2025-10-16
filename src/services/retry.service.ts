// src/services/retry.service.ts
import { GridClient } from '@sqds/grid';
import prisma from '../lib/prisma';
import Logger from '../utils/logger';
import { config } from '../config/env';

// Initialize Grid client
const gridClient = new GridClient({
  environment: config.grid.environment,
  apiKey: config.grid.apiKey,
});

// Interface for retry queue items
interface RetryItem {
  id: string;
  gridAddress: string;
  userData: {
    email: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    phoneNumber?: string | null;
    walletAddress: string;
    role?: string;
    isActive?: boolean;
  };
  attempts: number;
  lastAttempt: Date;
  createdAt: Date;
}

// In-memory retry queue (in production, use Redis or a proper queue system)
let retryQueue: RetryItem[] = [];

// Maximum retry attempts
const MAX_RETRY_ATTEMPTS = 5;

// Retry interval (5 minutes)
const RETRY_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Add a failed account to the retry queue
 */
export const addToRetryQueue = (
  gridAddress: string,
  userData: RetryItem['userData']
): void => {
  const retryItem: RetryItem = {
    id: `${gridAddress}-${Date.now()}`,
    gridAddress,
    userData,
    attempts: 0,
    lastAttempt: new Date(),
    createdAt: new Date(),
  };

  // Check if this address is already in the queue
  const existingItem = retryQueue.find(item => item.gridAddress === gridAddress);
  if (existingItem) {
    Logger.warn(`Grid address ${gridAddress} already in retry queue`);
    return;
  }

  retryQueue.push(retryItem);
  Logger.info(`Added ${gridAddress} to retry queue`);
};

/**
 * Process a single retry item
 */
const processRetryItem = async (item: RetryItem): Promise<boolean> => {
  try {
    Logger.info(`Processing retry for ${item.gridAddress} (attempt ${item.attempts + 1})`);

    // Fetch account details from Grid
    const account = await gridClient.getAccount(item.gridAddress);
    
    if (!account) {
      Logger.warn(`Account ${item.gridAddress} not found in Grid`);
      return false;
    }

    // Check if user already exists in database
    const existingUser = await prisma.user.findUnique({
      where: { email: item.userData.email },
    });

    if (existingUser) {
      Logger.info(`User ${item.userData.email} already exists in database`);
      return true; // Success - user exists
    }

    // Create user in database
    await prisma.user.create({
      data: {
        email: item.userData.email,
        firstName: item.userData.firstName,
        lastName: item.userData.lastName,
        middleName: item.userData.middleName,
        phoneNumber: item.userData.phoneNumber,
        walletAddress: item.userData.walletAddress,
        role: (item.userData.role as any) || 'USER',
        isActive: item.userData.isActive ?? true,
      },
    });

    Logger.info(`Successfully created user ${item.userData.email} in database`);
    return true; // Success

  } catch (error) {
    Logger.error(`Error processing retry for ${item.gridAddress}:`, error);
    return false; // Failed
  }
};

/**
 * Process all items in the retry queue
 */
const processRetryQueue = async (): Promise<void> => {
  if (retryQueue.length === 0) {
    return;
  }

  Logger.info(`Processing ${retryQueue.length} items in retry queue`);

  const itemsToProcess = [...retryQueue];
  const itemsToRemove: string[] = [];
  const itemsToRetry: RetryItem[] = [];

  for (const item of itemsToProcess) {
    const success = await processRetryItem(item);
    
    if (success) {
      // Success - remove from queue
      itemsToRemove.push(item.id);
      Logger.info(`Successfully processed ${item.gridAddress}, removing from queue`);
    } else {
      // Failed - increment attempts
      item.attempts++;
      item.lastAttempt = new Date();

      if (item.attempts >= MAX_RETRY_ATTEMPTS) {
        // Max attempts reached - remove from queue
        itemsToRemove.push(item.id);
        Logger.error(`Max retry attempts reached for ${item.gridAddress}, removing from queue`);
      } else {
        // Keep in queue for next retry
        itemsToRetry.push(item);
        Logger.warn(`Retry failed for ${item.gridAddress}, will retry later (attempt ${item.attempts}/${MAX_RETRY_ATTEMPTS})`);
      }
    }
  }

  // Update the retry queue
  retryQueue = itemsToRetry;
  
  // Log summary
  if (itemsToRemove.length > 0) {
    Logger.info(`Removed ${itemsToRemove.length} items from retry queue`);
  }
  if (itemsToRetry.length > 0) {
    Logger.info(`${itemsToRetry.length} items remain in retry queue`);
  }
};

/**
 * Start the retry service
 */
export const startRetryService = (): void => {
  Logger.info('Starting retry service...');
  
  // Process queue immediately
  processRetryQueue();
  
  // Set up interval to process queue every 5 minutes
  setInterval(() => {
    processRetryQueue();
  }, RETRY_INTERVAL_MS);

  Logger.info(`Retry service started - processing every ${RETRY_INTERVAL_MS / 1000 / 60} minutes`);
};

/**
 * Get retry queue status
 */
export const getRetryQueueStatus = () => {
  return {
    totalItems: retryQueue.length,
    items: retryQueue.map(item => ({
      id: item.id,
      gridAddress: item.gridAddress,
      email: item.userData.email,
      attempts: item.attempts,
      lastAttempt: item.lastAttempt,
      createdAt: item.createdAt,
    })),
  };
};

/**
 * Clear retry queue (for testing/admin purposes)
 */
export const clearRetryQueue = (): void => {
  retryQueue = [];
  Logger.info('Retry queue cleared');
};
