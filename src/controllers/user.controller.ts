// src/controllers/user.controller.ts
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import Logger from '../utils/logger';
import gridClient from '../lib/squad';
import { v4 as uuidv4 } from 'uuid';
import {
  savePending,
  getPending,
  removePending,
  PENDING_TTL_MS,
} from '../lib/gridSessions';
import { addToRetryQueue } from '../services/retry.service';
import {
  createUserSchema,
  updateUserSchema,
  initiateGridAccountSchema,
  completeGridAccountSchema,
  CreateUserInput,
  UpdateUserInput,
  InitiateGridAccountInput,
  CompleteGridAccountInput,
} from '../schemas/user.schemas';

// Helper function to extract wallet address from Grid response
const extractWalletAddress = (authResult: any): string => {
  try {
    // First try to get from policies.signers[0].address (primary signer)
    if (authResult?.data?.policies?.signers?.[0]?.address) {
      return authResult.data.policies.signers[0].address;
    }
    
    // Fallback to authentication[0].session.Privy.session.wallets[0].address
    if (authResult?.data?.authentication?.[0]?.session?.Privy?.session?.wallets?.[0]?.address) {
      return authResult.data.authentication[0].session.Privy.session.wallets[0].address;
    }
    
    // Last fallback to the main address field
    if (authResult?.data?.address) {
      return authResult.data.address;
    }
    
    Logger.warn('Could not extract wallet address from Grid response');
    return '';
  } catch (error) {
    Logger.error('Error extracting wallet address:', error);
    return '';
  }
};

// Helper function to check user uniqueness
const checkUserUniqueness = async (data: {
  email?: string;
  walletAddress?: string;
  excludeUserId?: string;
}) => {
  const conflicts: string[] = [];

  // Check email uniqueness
  if (data.email) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail && existingEmail.id !== data.excludeUserId) {
      conflicts.push('email');
    }
  }

  // Check walletAddress uniqueness
  if (data.walletAddress) {
    const existingWalletAddress = await prisma.user.findFirst({
      where: { 
        walletAddress: data.walletAddress,
        ...(data.excludeUserId && { id: { not: data.excludeUserId } })
      } as any,
    });
    if (existingWalletAddress) {
      conflicts.push('walletAddress');
    }
  }

  return conflicts;
};

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phoneNumber: true,
        walletAddress: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    Logger.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Get user by email
export const getUserByEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phoneNumber: true,
        walletAddress: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    Logger.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Get all users
export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phoneNumber: true,
        walletAddress: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users, count: users.length });
  } catch (error) {
    Logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Create user
export const createUser = async (req: Request, res: Response) => {
  try {
    const validatedData = req.body as CreateUserInput;
    const { email, firstName, lastName, middleName, phoneNumber } = validatedData;

    // Check uniqueness of all fields (excluding walletAddress since it's not provided)
    const conflicts = await checkUserUniqueness({
      email,
      excludeUserId: undefined,
    });

    if (conflicts.length > 0) {
      const conflictMessages = conflicts.map(field => {
        switch (field) {
          case 'email':
            return 'A user with this email already exists';
          default:
            return `A user with this ${field} already exists`;
        }
      });

      return res.status(409).json({
        error: 'User creation failed due to conflicts',
        conflicts: conflictMessages,
        fields: conflicts,
      });
    }

    const user = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        middleName,
        phoneNumber,
        walletAddress: null, // Will be set when Grid account is created
        role: 'USER',
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phoneNumber: true,
        walletAddress: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json({ user });
  } catch (error) {
    Logger.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = req.body as UpdateUserInput;

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check uniqueness for updated fields
    const conflicts = await checkUserUniqueness({
      email: validatedData.email,
      excludeUserId: id,
    });

    if (conflicts.length > 0) {
      const conflictMessages = conflicts.map(field => {
        switch (field) {
          case 'email':
            return 'A user with this email already exists';
          case 'walletAddress':
            return 'A user with this wallet address already exists';
          default:
            return `A user with this ${field} already exists`;
        }
      });

      return res.status(409).json({
        error: 'User update failed due to conflicts',
        conflicts: conflictMessages,
        fields: conflicts,
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: validatedData as any,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phoneNumber: true,
        walletAddress: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ user });
  } catch (error) {
    Logger.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    Logger.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Initiate Grid account creation
export const initiateGridAccount = async (req: Request, res: Response) => {
  try {
    const validatedData = req.body as InitiateGridAccountInput;
    const { email, firstName, lastName, middleName, phoneNumber } = validatedData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: 'User with this email already exists',
        field: 'email'
      });
    }

    // Check if phone number already exists (if provided)
    if (phoneNumber && phoneNumber.trim() !== '') {
      const existingPhoneUser = await prisma.user.findFirst({
        where: { phoneNumber },
      });

      if (existingPhoneUser) {
        return res.status(409).json({ 
          error: 'User with this phone number already exists',
          field: 'phoneNumber'
        });
      }
    }

    const response = await gridClient.createAccount({ email });
    const user = response.data;

    const sessionSecrets = await gridClient.generateSessionSecrets();

    const pendingKey = uuidv4();
    const createdAt = Date.now();
    await savePending(pendingKey, { 
      user, 
      sessionSecrets, 
      createdAt,
      userData: {
        email,
        firstName,
        lastName,
        middleName,
        phoneNumber,
      }
    });

    const expiresAt = new Date(createdAt + PENDING_TTL_MS).toISOString();
    const maskedKey = `${pendingKey.slice(0, 8)}...${pendingKey.slice(-4)}`;

    Logger.info(
      `Initiated Grid account for user ${email}, pendingKey=${pendingKey}`
    );

    res.status(201).json({ pendingKey, maskedKey, expiresAt });
  } catch (error) {
    Logger.error('Error initiating Grid account:', error);
    res.status(500).json({ error: 'Failed to initiate Grid account' });
  }
};

// Complete Grid account creation
export const completeGridAccount = async (req: Request, res: Response) => {
  try {
    const validatedData = req.body as CompleteGridAccountInput;
    const { pendingKey, otpCode } = validatedData;

    const pending = await getPending(pendingKey);
    if (!pending)
      return res
        .status(410)
        .json({ error: 'Pending session not found or expired' });

    // Create Grid account
    const authResult = await gridClient.completeAuthAndCreateAccount({
      user: pending.user,
      otpCode,
      sessionSecrets: pending.sessionSecrets,
    });

    if (authResult?.success) {
      // Extract wallet address from Grid response
      const walletAddress = extractWalletAddress(authResult);
      
      if (!walletAddress) {
        Logger.error('Failed to extract wallet address from Grid response');
        return res.status(500).json({ error: 'Failed to extract wallet address from Grid account' });
      }

      // Create user in database if userData exists
      if (pending.userData) {
        const { email, firstName, lastName, middleName, phoneNumber } = pending.userData;
        
        // Check if user already exists (double-check in case of race conditions)
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          Logger.info(`User ${email} already exists in database, skipping creation`);
          await removePending(pendingKey);
          return res.status(201).json({
            user: existingUser,
            gridAccount: {
              address: authResult.data?.address || '',
              status: authResult.data?.status || 'unknown',
              policies: authResult.data?.policies || {},
            },
          });
        }

        // Check if phone number already exists (if provided)
        if (phoneNumber && phoneNumber.trim() !== '') {
          const existingPhoneUser = await prisma.user.findFirst({
            where: { phoneNumber },
          });

          if (existingPhoneUser) {
            Logger.error(`Phone number ${phoneNumber} already exists in database`);
            await removePending(pendingKey);
            return res.status(409).json({ 
              error: 'User with this phone number already exists',
              field: 'phoneNumber'
            });
          }
        }
        
        try {
          const user = await prisma.user.create({
            data: {
              email,
              firstName,
              lastName,
              middleName,
              phoneNumber,
              walletAddress, // Use extracted wallet address
              role: 'USER',
              isActive: true,
            },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              middleName: true,
              phoneNumber: true,
              walletAddress: true,
              role: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
          });

          Logger.info(`Created user in database: ${email} with wallet: ${walletAddress}`);

          // Clean up pending session
          await removePending(pendingKey);

          // Add to retry queue if there was a database error but Grid account was created
          if (walletAddress) {
            Logger.info(`Adding ${walletAddress} to retry queue due to database error`);
            addToRetryQueue(walletAddress, {
              email,
              firstName,
              lastName,
              middleName,
              phoneNumber,
              walletAddress: walletAddress,
              role: 'USER',
              isActive: true,
            });
          }

          res.status(201).json({
            user,
            gridAccount: {
              address: authResult.data?.address || '',
              status: authResult.data?.status || 'unknown',
              policies: authResult.data?.policies || {},
            },
          });
        } catch (dbError) {
          Logger.error('Database error during user creation:', dbError);
          
          // Clean up pending session
          await removePending(pendingKey);
          
          res.status(500).json({ 
            error: 'Failed to create user in database',
            gridAccount: {
              address: authResult.data?.address || '',
              status: authResult.data?.status || 'unknown',
              policies: authResult.data?.policies || {},
            }
          });
        }
      } else {
        Logger.error('No userData found in pending session');
        res.status(500).json({ error: 'Invalid pending session data' });
      }
    } else {
      Logger.error('Grid account creation failed:', authResult);
      res.status(500).json({ error: 'Failed to create Grid account' });
    }
  } catch (error) {
    Logger.error('Error completing Grid account:', error);
    res.status(500).json({ error: 'Failed to complete Grid account creation' });
  }
};