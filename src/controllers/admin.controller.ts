// src/controllers/admin.controller.ts
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import Logger from '../utils/logger';
import { config } from '../config/env';
import gridClient from '../lib/squad';
import { AdminCleanupService } from '../services/admin-cleanup.service';
import { Keypair } from '@solana/web3.js';
import {
  updateAdminSchema,
  createCustomSignerAdminSchema,
  UpdateAdminInput,
  CreateCustomSignerAdminInput,
} from '../schemas/admin.schemas';

// Helper function to update admin activity
const updateAdminActivity = async (adminId: string): Promise<void> => {
  try {
    await AdminCleanupService.updateAdminActivity(adminId);
  } catch (error) {
    Logger.error(`Failed to update admin activity: ${error}`);
  }
};

// Helper function to update admin vote activity
const updateAdminVoteActivity = async (adminId: string): Promise<void> => {
  try {
    await AdminCleanupService.updateAdminVoteActivity(adminId);
  } catch (error) {
    Logger.error(`Failed to update admin vote activity: ${error}`);
  }
};

// Helper function to update admin execute activity
const updateAdminExecuteActivity = async (adminId: string): Promise<void> => {
  try {
    await AdminCleanupService.updateAdminExecuteActivity(adminId);
  } catch (error) {
    Logger.error(`Failed to update admin execute activity: ${error}`);
  }
};

// Helper function to check admin uniqueness
const checkAdminUniqueness = async (data: {
  email?: string;
  walletAddress?: string;
  excludeAdminId?: string;
}) => {
  const conflicts: string[] = [];

  // Check email uniqueness
  if (data.email) {
    const existingEmail = await prisma.admin.findUnique({
      where: { email: data.email },
    });
    if (existingEmail && existingEmail.id !== data.excludeAdminId) {
      conflicts.push('email');
    }
  }

  // Check walletAddress uniqueness (if provided)
  if (data.walletAddress && data.walletAddress.trim() !== '') {
    const existingWalletAddress = await prisma.admin.findFirst({
      where: { 
        walletAddress: data.walletAddress,
        ...(data.excludeAdminId && { id: { not: data.excludeAdminId } })
      } as any,
    });
    if (existingWalletAddress) {
      conflicts.push('walletAddress');
    }
  }

  return conflicts;
};

// Get admin by ID
export const getAdminById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const admin = await prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        permissions: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      } as any,
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    Logger.info(`Retrieved admin: ${admin.email}`);
    res.json({ admin });
  } catch (error) {
    Logger.error('Error fetching admin:', error);
    res.status(500).json({ error: 'Failed to fetch admin' });
  }
};

// Get admin by email
export const getAdminByEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    const admin = await prisma.admin.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        permissions: true,
        isActive: true,
        lastActivityAt: true,
        createdAt: true,
        updatedAt: true,
      } as any,
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    Logger.info(`Retrieved admin by email: ${admin.email}`);
    res.json({ admin });
  } catch (error) {
    Logger.error('Error fetching admin by email:', error);
    res.status(500).json({ error: 'Failed to fetch admin by email' });
  }
};

// Update admin
export const updateAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = req.body as UpdateAdminInput;

    // Check if admin exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { id },
    });

    if (!existingAdmin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Check uniqueness for updated fields
    const conflicts = await checkAdminUniqueness({
      email: validatedData.email,
      walletAddress: validatedData.walletAddress,
      excludeAdminId: id,
    });

    if (conflicts.length > 0) {
      const conflictMessages = conflicts.map(field => {
        switch (field) {
          case 'email':
            return 'An admin with this email already exists';
          case 'walletAddress':
            return 'An admin with this wallet address already exists';
          default:
            return `An admin with this ${field} already exists`;
        }
      });

      return res.status(409).json({
        error: 'Admin update failed due to conflicts',
        conflicts: conflictMessages,
        fields: conflicts,
      });
    }

    const admin = await prisma.admin.update({
      where: { id },
      data: validatedData as any,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        permissions: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      } as any,
    });

    // Update admin activity
    await updateAdminActivity(id);

    Logger.info(`Updated admin: ${admin.email}`);
    res.json({ admin });
  } catch (error) {
    Logger.error('Error updating admin:', error);
    res.status(500).json({ error: 'Failed to update admin' });
  }
};

// Delete admin
export const deleteAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingAdmin = await prisma.admin.findUnique({
      where: { id },
    });

    if (!existingAdmin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    await prisma.admin.delete({
      where: { id },
    });

    Logger.info(`Deleted admin: ${existingAdmin.email}`);
    res.status(204).send();
  } catch (error) {
    Logger.error('Error deleting admin:', error);
    res.status(500).json({ error: 'Failed to delete admin' });
  }
};

// Get admins by permissions
export const getAdminsByPermissions = async (req: Request, res: Response) => {
  try {
    const { permissions } = req.query;
    
    if (!permissions || typeof permissions !== 'string') {
      return res.status(400).json({ error: 'Permissions parameter is required' });
    }

    const permissionList = permissions.split(',').map(p => p.trim());

    const admins = await prisma.admin.findMany({
      where: {
        OR: permissionList.map(permission => ({
          permissions: {
            has: permission as any, // Type cast to handle AdminPermission enum
          },
        })),
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        permissions: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      } as any,
    });

    Logger.info(`Retrieved ${admins.length} admins with permissions: ${permissionList.join(', ')}`);
    res.json({ admins });
  } catch (error) {
    Logger.error('Error fetching admins by permissions:', error);
    res.status(500).json({ error: 'Failed to fetch admins by permissions' });
  }
};

// Create admin with custom signer (keypair)
export const createCustomSignerAdmin = async (req: Request, res: Response) => {
  try {
    const validatedData = req.body as CreateCustomSignerAdminInput;
    const { email, firstName, lastName, permissions, secretKey } = validatedData;

    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      return res.status(409).json({ error: 'Admin with this email already exists' });
    }

    // Generate or use provided keypair
    let keypair: Keypair;
    if (secretKey) {
      // Use provided secret key
      try {
        const secretKeyBytes = Buffer.from(secretKey, 'base64');
        keypair = Keypair.fromSecretKey(secretKeyBytes);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid secret key format' });
      }
    } else {
      // Generate new keypair
      keypair = Keypair.generate();
    }

    const publicKey = keypair.publicKey.toBase58();
    const secretKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');

    // Create Grid account with custom signer
    try {
      const gridAccount = await gridClient.createAccount({
        type: 'signers',
        policies: {
          threshold: 1,
          signers: [
            {
              address: publicKey,
              role: 'primary',
              permissions: ['CAN_VOTE', 'CAN_EXECUTE'], // Admin should only vote and execute, not initiate
              provider: 'privy',
            },
          ],
        },
      });

      // Extract Grid account address with flexible parsing
      const gridAccountAddress = 
        (gridAccount.data as any)?.address ||
        (gridAccount.data as any)?.policies?.signers?.[0]?.address ||
        null;

      if (!gridAccountAddress) {
        throw new Error('Failed to extract Grid account address');
      }

      // Create admin in database
      const admin = await prisma.admin.create({
        data: {
          email,
          firstName,
          lastName,
          walletAddress: gridAccountAddress, // Grid account address
          publicKey, // Store the public key
          secretKey: secretKeyBase64, // Store the secret key (base64 encoded)
          permissions,
        } as any,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          walletAddress: true,
          publicKey: true,
          permissions: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        } as any,
      });

      Logger.info(`Created custom signer admin: ${email} with Grid account: ${gridAccountAddress}`);

      res.status(201).json({
        message: 'Custom signer admin created successfully',
        admin: {
          ...admin,
          secretKey: secretKeyBase64, // Return the secret key for the client
        },
        gridAccount: {
          address: gridAccountAddress,
          publicKey: publicKey,
        },
      });
    } catch (error) {
      Logger.error(`Failed to create Grid account for admin ${email}: ${error}`);
      return res.status(500).json({ error: 'Failed to create Grid account for admin' });
    }
  } catch (error) {
    Logger.error('Error creating custom signer admin:', error);
    res.status(500).json({ error: 'Failed to create custom signer admin' });
  }
};

// Vote on a transaction
export const voteOnTransaction = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const { adminId, vote } = req.body; // vote: 'approve' or 'reject'

    // Get admin
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, permissions: true }
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    if (!admin.permissions.includes('CAN_VOTE')) {
      return res.status(403).json({ error: 'Admin does not have CAN_VOTE permission' });
    }

    // Get transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (!transaction.adminEmails.includes(admin.email)) {
      return res.status(403).json({ error: 'Admin is not authorized to vote on this transaction' });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(400).json({ error: 'Transaction is not in PENDING status' });
    }

    // Update admin vote activity
    await updateAdminVoteActivity(admin.id);

    // Here you would implement the actual voting logic
    // For now, we'll just log the vote
    Logger.info(`Admin ${admin.email} voted ${vote} on transaction ${transactionId}`);

    res.json({ 
      message: `Vote ${vote} recorded successfully`,
      transactionId,
      adminEmail: admin.email,
      vote
    });
  } catch (error) {
    Logger.error('Error voting on transaction:', error);
    res.status(500).json({ error: 'Failed to vote on transaction' });
  }
};

// Execute a transaction
export const executeTransaction = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const { adminId } = req.body;

    // Get admin
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, permissions: true }
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    if (!admin.permissions.includes('CAN_EXECUTE')) {
      return res.status(403).json({ error: 'Admin does not have CAN_EXECUTE permission' });
    }

    // Get transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (!transaction.adminEmails.includes(admin.email)) {
      return res.status(403).json({ error: 'Admin is not authorized to execute this transaction' });
    }

    if (transaction.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Transaction is not in APPROVED status' });
    }

    // Update admin execute activity
    await updateAdminExecuteActivity(admin.id);

    // Update transaction status to EXECUTED
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'EXECUTED' }
    });

    Logger.info(`Admin ${admin.email} executed transaction ${transactionId}`);

    res.json({ 
      message: 'Transaction executed successfully',
      transactionId,
      adminEmail: admin.email,
      status: 'EXECUTED'
    });
  } catch (error) {
    Logger.error('Error executing transaction:', error);
    res.status(500).json({ error: 'Failed to execute transaction' });
  }
};

// Perform admin cleanup
export const performAdminCleanup = async (req: Request, res: Response) => {
  try {
    const result = await AdminCleanupService.getInstance().performCleanup();
    
    res.json({
      message: 'Admin cleanup completed',
      result
    });
  } catch (error) {
    Logger.error('Error performing admin cleanup:', error);
    res.status(500).json({ error: 'Failed to perform admin cleanup' });
  }
};

// Get admin cleanup status
export const getAdminCleanupStatus = async (req: Request, res: Response) => {
  try {
    const inactiveCount = await AdminCleanupService.getInactiveAdminsCount();
    
    res.json({
      cleanupEnabled: config.admin.inactivity.enabled,
      inactiveAdminsCount: inactiveCount,
      timeoutHours: config.admin.inactivity.timeoutHours,
      cleanupIntervalMinutes: config.admin.inactivity.cleanupIntervalMinutes,
    });
  } catch (error) {
    Logger.error('Error getting admin cleanup status:', error);
    res.status(500).json({ error: 'Failed to get admin cleanup status' });
  }
};

