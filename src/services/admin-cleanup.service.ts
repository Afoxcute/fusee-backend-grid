// src/services/admin-cleanup.service.ts
import prisma from '../lib/prisma';
import Logger from '../utils/logger';
import { config } from '../config/env';
import gridClient from '../lib/squad';

interface AdminCleanupResult {
  removedAdmins: number;
  updatedAccounts: number;
  errors: string[];
}

/**
 * Service to handle automatic cleanup of inactive admins
 */
export class AdminCleanupService {
  private static instance: AdminCleanupService;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): AdminCleanupService {
    if (!AdminCleanupService.instance) {
      AdminCleanupService.instance = new AdminCleanupService();
    }
    return AdminCleanupService.instance;
  }

  /**
   * Start the admin cleanup service
   */
  public start(): void {
    if (!config.admin.inactivity.enabled) {
      Logger.info('Admin inactivity cleanup is disabled');
      return;
    }

    const intervalMs = config.admin.inactivity.cleanupIntervalMinutes * 60 * 1000;
    
    Logger.info(`Starting admin cleanup service - checking every ${config.admin.inactivity.cleanupIntervalMinutes} minutes`);
    
    // Run immediately on startup
    this.performCleanup();
    
    // Set up recurring cleanup
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, intervalMs);
  }

  /**
   * Stop the admin cleanup service
   */
  public stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      Logger.info('Admin cleanup service stopped');
    }
  }

  /**
   * Perform the cleanup process
   */
  public async performCleanup(): Promise<AdminCleanupResult> {
    const result: AdminCleanupResult = {
      removedAdmins: 0,
      updatedAccounts: 0,
      errors: []
    };

    try {
      Logger.info('Starting admin transaction activity cleanup...');
      
      // Calculate cutoff time (48 hours ago)
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - config.admin.inactivity.timeoutHours);
      
      // Get all active admins with CAN_VOTE or CAN_EXECUTE permissions
      const adminsWithVoteExecutePermissions = await prisma.admin.findMany({
        where: {
          isActive: true,
          OR: [
            {
              permissions: {
                has: 'CAN_VOTE',
              },
            },
            {
              permissions: {
                has: 'CAN_EXECUTE',
              },
            },
          ],
        }
      });

      if (adminsWithVoteExecutePermissions.length === 0) {
        Logger.info('No admins with vote/execute permissions found');
        return result;
      }

      Logger.info(`Checking ${adminsWithVoteExecutePermissions.length} admins for transaction activity`);

      // Check each admin for inactivity
      for (const admin of adminsWithVoteExecutePermissions) {
        try {
          // Check if admin has been inactive for voting/executing
          const shouldRevokeVote = await this.shouldRevokeVotePermission(admin, cutoffTime);
          const shouldRevokeExecute = await this.shouldRevokeExecutePermission(admin, cutoffTime);

          if (shouldRevokeVote || shouldRevokeExecute) {
            // Update admin permissions
            const updatedPermissions = admin.permissions.filter(permission => {
              if (shouldRevokeVote && permission === 'CAN_VOTE') return false;
              if (shouldRevokeExecute && permission === 'CAN_EXECUTE') return false;
              return true;
            });

            await prisma.admin.update({
              where: { id: admin.id },
              data: { permissions: updatedPermissions }
            });

            const revokedPermissions = [];
            if (shouldRevokeVote) revokedPermissions.push('CAN_VOTE');
            if (shouldRevokeExecute) revokedPermissions.push('CAN_EXECUTE');

            Logger.info(`Revoked permissions [${revokedPermissions.join(', ')}] from admin: ${admin.email}`);
            result.removedAdmins++;

            // Update Grid accounts for all users
            const usersWithAccounts = await prisma.user.findMany({
              where: {
                walletAddress: { not: null }
              },
              select: {
                id: true,
                email: true,
                walletAddress: true
              }
            });

            for (const user of usersWithAccounts) {
              if (user.walletAddress) {
                try {
                  await this.updateGridAccountPolicies(user.walletAddress);
                  result.updatedAccounts++;
                } catch (error) {
                  const errorMsg = `Failed to update Grid account for user ${user.email}: ${error}`;
                  Logger.error(errorMsg);
                  result.errors.push(errorMsg);
                }
              }
            }
          }

        } catch (error) {
          const errorMsg = `Failed to process admin ${admin.email}: ${error}`;
          Logger.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      Logger.info(`Admin cleanup completed: ${result.removedAdmins} admins had permissions revoked, ${result.updatedAccounts} accounts updated`);

    } catch (error) {
      const errorMsg = `Admin cleanup failed: ${error}`;
      Logger.error(errorMsg);
      result.errors.push(errorMsg);
    }

    return result;
  }

  /**
   * Check if admin should have CAN_VOTE permission revoked
   */
  private async shouldRevokeVotePermission(admin: any, cutoffTime: Date): Promise<boolean> {
    // Only check if admin has CAN_VOTE permission
    if (!admin.permissions.includes('CAN_VOTE')) {
      return false;
    }

    // Check if admin has voted recently
    if (admin.lastVoteActivityAt && admin.lastVoteActivityAt > cutoffTime) {
      return false; // Admin voted recently, keep permission
    }

    // Check if there were transactions available for voting in the last 48 hours
    const transactionsAvailableForVoting = await prisma.transaction.findMany({
      where: {
        adminEmails: {
          has: admin.email
        },
        status: 'PENDING',
        createdAt: {
          gte: cutoffTime
        }
      }
    });

    // If there were transactions available but admin didn't vote, revoke permission
    return transactionsAvailableForVoting.length > 0;
  }

  /**
   * Check if admin should have CAN_EXECUTE permission revoked
   */
  private async shouldRevokeExecutePermission(admin: any, cutoffTime: Date): Promise<boolean> {
    // Only check if admin has CAN_EXECUTE permission
    if (!admin.permissions.includes('CAN_EXECUTE')) {
      return false;
    }

    // Check if admin has executed recently
    if (admin.lastExecuteActivityAt && admin.lastExecuteActivityAt > cutoffTime) {
      return false; // Admin executed recently, keep permission
    }

    // Check if there were approved transactions available for execution in the last 48 hours
    const transactionsAvailableForExecution = await prisma.transaction.findMany({
      where: {
        adminEmails: {
          has: admin.email
        },
        status: 'APPROVED',
        createdAt: {
          gte: cutoffTime
        }
      }
    });

    // If there were transactions available but admin didn't execute, revoke permission
    return transactionsAvailableForExecution.length > 0;
  }

  /**
   * Update Grid account policies after admin removal
   */
  private async updateGridAccountPolicies(userWalletAddress: string): Promise<void> {
    try {
      // Get current active admins
      const activeAdmins = await prisma.admin.findMany({
        where: {
          isActive: true,
          OR: [
            {
              permissions: {
                has: 'CAN_INITIATE',
              },
            },
            {
              permissions: {
                has: 'CAN_VOTE',
              },
            },
            {
              permissions: {
                has: 'CAN_EXECUTE',
              },
            },
          ],
        },
        select: {
          id: true,
          email: true,
          walletAddress: true,
          publicKey: true,
          permissions: true,
          isActive: true,
        } as any, // Type assertion to handle new fields
      });

      // Build new signers list
      const signers = [
        {
          address: userWalletAddress,
          role: 'primary' as const,
          permissions: ['CAN_INITIATE'] as const,
          provider: 'privy' as const,
        },
        ...activeAdmins.map(admin => ({
          address: admin.publicKey || admin.walletAddress || '', // Use publicKey first, fallback to walletAddress
          role: 'primary' as const, // Grid API only accepts 'primary' or 'backup'
          permissions: (admin.permissions as any[]).filter((p: any) => 
            ['CAN_VOTE', 'CAN_EXECUTE'].includes(p) // Remove CAN_INITIATE for admins
          ) as ('CAN_VOTE' | 'CAN_EXECUTE')[],
          provider: 'privy' as const,
        }))
      ].filter(signer => signer.address);

      if (signers.length > 1) {
        // Calculate new threshold
        const calculatedThreshold = Math.min(config.admin.votingThreshold, signers.length);
        const validatedThreshold = Math.max(
          config.admin.minThreshold,
          Math.min(config.admin.maxThreshold, calculatedThreshold)
        );

        // Prepare update configuration
        const updateConfig: any = {
          signers,
          threshold: validatedThreshold,
        };

        // Add time delay if enabled
        if (config.admin.timeDelay.enabled) {
          const validatedDelaySeconds = Math.max(
            config.admin.timeDelay.minDelaySeconds,
            Math.min(config.admin.timeDelay.maxDelaySeconds, config.admin.timeDelay.delaySeconds)
          );
          updateConfig.timeLock = validatedDelaySeconds;
        }

        // Update Grid account
        await gridClient.updateAccount(userWalletAddress, updateConfig);
        
        Logger.info(`Updated Grid account ${userWalletAddress} with ${signers.length} signers (threshold: ${validatedThreshold})`);
      } else {
        Logger.warn(`Not enough signers for Grid account ${userWalletAddress} after admin cleanup`);
      }

    } catch (error) {
      Logger.error(`Failed to update Grid account policies for ${userWalletAddress}: ${error}`);
      throw error;
    }
  }

  /**
   * Update admin activity timestamp
   */
  public static async updateAdminActivity(adminId: string): Promise<void> {
    try {
      await prisma.admin.update({
        where: { id: adminId },
        data: { lastActivityAt: new Date() }
      });
    } catch (error) {
      Logger.error(`Failed to update admin activity for ${adminId}: ${error}`);
    }
  }

  /**
   * Update admin vote activity timestamp
   */
  public static async updateAdminVoteActivity(adminId: string): Promise<void> {
    try {
      await prisma.admin.update({
        where: { id: adminId },
        data: { 
          lastActivityAt: new Date(),
          lastVoteActivityAt: new Date()
        }
      });
    } catch (error) {
      Logger.error(`Failed to update admin vote activity for ${adminId}: ${error}`);
    }
  }

  /**
   * Update admin execute activity timestamp
   */
  public static async updateAdminExecuteActivity(adminId: string): Promise<void> {
    try {
      await prisma.admin.update({
        where: { id: adminId },
        data: { 
          lastActivityAt: new Date(),
          lastExecuteActivityAt: new Date()
        }
      });
    } catch (error) {
      Logger.error(`Failed to update admin execute activity for ${adminId}: ${error}`);
    }
  }

  /**
   * Get inactive admins count (admins who should have vote/execute permissions revoked)
   */
  public static async getInactiveAdminsCount(): Promise<number> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - config.admin.inactivity.timeoutHours);
      
      const adminsWithVoteExecutePermissions = await prisma.admin.findMany({
        where: {
          isActive: true,
          OR: [
            {
              permissions: {
                has: 'CAN_VOTE',
              },
            },
            {
              permissions: {
                has: 'CAN_EXECUTE',
              },
            },
          ],
        }
      });

      let inactiveCount = 0;
      for (const admin of adminsWithVoteExecutePermissions) {
        const shouldRevokeVote = await this.shouldRevokeVotePermission(admin, cutoffTime);
        const shouldRevokeExecute = await this.shouldRevokeExecutePermission(admin, cutoffTime);
        
        if (shouldRevokeVote || shouldRevokeExecute) {
          inactiveCount++;
        }
      }

      return inactiveCount;
    } catch (error) {
      Logger.error(`Failed to get inactive admins count: ${error}`);
      return 0;
    }
  }

  /**
   * Check if admin should have CAN_VOTE permission revoked (static version for external use)
   */
  private static async shouldRevokeVotePermission(admin: any, cutoffTime: Date): Promise<boolean> {
    // Only check if admin has CAN_VOTE permission
    if (!admin.permissions.includes('CAN_VOTE')) {
      return false;
    }

    // Check if admin has voted recently
    if (admin.lastVoteActivityAt && admin.lastVoteActivityAt > cutoffTime) {
      return false; // Admin voted recently, keep permission
    }

    // Check if there were transactions available for voting in the last 48 hours
    const transactionsAvailableForVoting = await prisma.transaction.findMany({
      where: {
        adminEmails: {
          has: admin.email
        },
        status: 'PENDING',
        createdAt: {
          gte: cutoffTime
        }
      }
    });

    // If there were transactions available but admin didn't vote, revoke permission
    return transactionsAvailableForVoting.length > 0;
  }

  /**
   * Check if admin should have CAN_EXECUTE permission revoked (static version for external use)
   */
  private static async shouldRevokeExecutePermission(admin: any, cutoffTime: Date): Promise<boolean> {
    // Only check if admin has CAN_EXECUTE permission
    if (!admin.permissions.includes('CAN_EXECUTE')) {
      return false;
    }

    // Check if admin has executed recently
    if (admin.lastExecuteActivityAt && admin.lastExecuteActivityAt > cutoffTime) {
      return false; // Admin executed recently, keep permission
    }

    // Check if there were approved transactions available for execution in the last 48 hours
    const transactionsAvailableForExecution = await prisma.transaction.findMany({
      where: {
        adminEmails: {
          has: admin.email
        },
        status: 'APPROVED',
        createdAt: {
          gte: cutoffTime
        }
      }
    });

    // If there were transactions available but admin didn't execute, revoke permission
    return transactionsAvailableForExecution.length > 0;
  }
}

// Export singleton instance
export const adminCleanupService = AdminCleanupService.getInstance();

