import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import Logger from '../utils/logger';
import gridClient from '../lib/squad';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env';
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

// Helper function to check uniqueness of user fields
const checkUserUniqueness = async (data: {
  email?: string;
  middleName?: string;
  phoneNumber?: string;
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

  // Check middleName uniqueness (if provided and not empty)
  if (data.middleName && data.middleName.trim() !== '') {
    const existingMiddleName = await prisma.user.findFirst({
      where: { 
        middleName: data.middleName,
        ...(data.excludeUserId && { id: { not: data.excludeUserId } })
      } as any, // Type assertion to handle Prisma client type issues
    });
    if (existingMiddleName) {
      conflicts.push('middleName');
    }
  }

  // Check phoneNumber uniqueness (if provided and not empty)
  if (data.phoneNumber && data.phoneNumber.trim() !== '') {
    const existingPhoneNumber = await prisma.user.findUnique({
      where: { phoneNumber: data.phoneNumber },
    });
    if (existingPhoneNumber && existingPhoneNumber.id !== data.excludeUserId) {
      conflicts.push('phoneNumber');
    }
  }

  // Check walletAddress uniqueness
  if (data.walletAddress) {
    const existingWalletAddress = await prisma.user.findFirst({
      where: { 
        walletAddress: data.walletAddress,
        ...(data.excludeUserId && { id: { not: data.excludeUserId } })
      } as any, // Type assertion to handle Prisma client type issues
    });
    if (existingWalletAddress) {
      conflicts.push('walletAddress');
    }
  }

  return conflicts;
};

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
        createdAt: true,
        updatedAt: true,
      } as any, // Type assertion to handle Prisma client type issues
    });

    Logger.info(`Retrieved ${users.length} users`);
    res.json({ users });
  } catch (error) {
    Logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const validatedData = req.body as CreateUserInput;
    const { email, firstName, lastName, middleName, phoneNumber } = validatedData;

    // Check uniqueness of all fields (excluding walletAddress since it's not provided)
    const conflicts = await checkUserUniqueness({
      email,
      middleName,
      phoneNumber,
    });

    if (conflicts.length > 0) {
      const conflictMessages = conflicts.map(field => {
        switch (field) {
          case 'email':
            return 'A user with this email already exists';
          case 'middleName':
            return 'A user with this middle name already exists';
          case 'phoneNumber':
            return 'A user with this phone number already exists';
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
        middleName: middleName && middleName.trim() !== '' ? middleName : null,
        phoneNumber: phoneNumber && phoneNumber.trim() !== '' ? phoneNumber : null,
        walletAddress: null, // Will be set when Grid account is created
      } as any, // Type assertion to handle Prisma client type issues
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phoneNumber: true,
        walletAddress: true,
        createdAt: true,
        updatedAt: true,
      } as any, // Type assertion to handle Prisma client type issues
    });

    Logger.info(`Created user: ${user.email}`);
    res.status(201).json({ user });
  } catch (error) {
    Logger.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

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

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = req.body as UpdateUserInput;
    const { email, firstName, lastName, middleName, phoneNumber } = validatedData;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return res.status(409).json({ error: 'Email already exists' });
      }
    }

    // Check if phone number is being changed and if it already exists
    if (phoneNumber && phoneNumber !== existingUser.phoneNumber) {
      const phoneExists = await prisma.user.findUnique({
        where: { phoneNumber },
      });

      if (phoneExists) {
        return res.status(409).json({ error: 'Phone number already exists' });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(email && { email }),
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(middleName !== undefined && { 
          middleName: middleName && middleName.trim() !== '' ? middleName : null 
        }),
        ...(phoneNumber !== undefined && { 
          phoneNumber: phoneNumber && phoneNumber.trim() !== '' ? phoneNumber : null 
        }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        middleName: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    Logger.info(`Updated user: ${user.email}`);
    res.json({ user });
  } catch (error) {
    Logger.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.delete({
      where: { id },
    });

    Logger.info(`Deleted user: ${existingUser.email}`);
    res.status(204).send();
  } catch (error) {
    Logger.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const initiateGridAccount = async (req: Request, res: Response) => {
  try {
    const validatedData = req.body as InitiateGridAccountInput;
    const { email, firstName, lastName, middleName, phoneNumber } = validatedData;

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
        middleName: middleName && middleName.trim() !== '' ? middleName : null,
        phoneNumber: phoneNumber && phoneNumber.trim() !== '' ? phoneNumber : null,
      }
    });

    const expiresAt = new Date(createdAt + PENDING_TTL_MS).toISOString();
    const maskedKey = `${pendingKey.slice(0, 8)}...${pendingKey.slice(-4)}`;

    Logger.info(
      `Initiated Grid account for ${email}, pendingKey=${pendingKey}`
    );
    // Frontend-friendly payload: opaque key, masked preview, and expiry info
    res.status(201).json({ pendingKey, maskedKey, expiresAt });
  } catch (error) {
    Logger.error('Error initiating Grid account:', error);
    res.status(500).json({ error: 'Failed to initiate Grid account' });
  }
};

export const completeGridAccount = async (req: Request, res: Response) => {
  try {
    const validatedData = req.body as CompleteGridAccountInput;
    const { pendingKey, otpCode } = validatedData;

    const pending = await getPending(pendingKey);
    if (!pending)
      return res
        .status(410)
        .json({ error: 'Pending session not found or expired' });

    // Get admins with CAN_VOTE and CAN_EXECUTE permissions for this user
    const admins = await prisma.admin.findMany({
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
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        publicKey: true,
        permissions: true,
        isActive: true,
      } as any, // Type assertion to handle new fields
    });

    // Create Grid account first (without admin policies initially)
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

      // Update Grid account with admin policies if admins are available
      if (admins.length > 0) {
        try {
          // Build signers configuration with actual user wallet address
          const signers = [
            {
              address: walletAddress,
              role: 'primary',
              permissions: ['CAN_INITIATE']
            },
            ...admins.map(admin => ({
              address: admin.publicKey || admin.walletAddress || '', // Use publicKey first, fallback to walletAddress
              role: 'primary', // Grid API only accepts 'primary' or 'backup'
              permissions: (admin.permissions as any[]).filter((p: any) => ['CAN_VOTE', 'CAN_EXECUTE'].includes(p)) // Remove CAN_INITIATE for admins
            }))
          ].filter(signer => signer.address); // Only include signers with wallet addresses

          if (signers.length > 1 && authResult.data?.address) {
            // Calculate threshold with validation
            const calculatedThreshold = Math.min(config.admin.votingThreshold, signers.length);
            const validatedThreshold = Math.max(
              config.admin.minThreshold,
              Math.min(config.admin.maxThreshold, calculatedThreshold)
            );
            
            // Prepare update configuration with time delay
            const updateConfig: any = {
              signers: signers.map(signer => ({
                address: signer.address,
                role: signer.role as ('primary' | 'backup'),
                permissions: signer.permissions as ('CAN_INITIATE' | 'CAN_VOTE' | 'CAN_EXECUTE')[],
                provider: 'privy' as const,
              })),
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

            // Update Grid account with admin policies using updateAccount method
            await gridClient.updateAccount(authResult.data.address, updateConfig);
            
            const delayInfo = config.admin.timeDelay.enabled 
              ? `, time delay: ${updateConfig.timeLock}s` 
              : '';
            Logger.info(`Updated Grid account ${authResult.data.address} with ${signers.length} signers including ${admins.length} admins (threshold: ${validatedThreshold}${delayInfo})`);
          }
        } catch (policyError) {
          Logger.error('Error updating Grid account policies:', policyError);
          // Don't fail the account creation if policy update fails
        }
      }

      // Create user in our database if userData exists
      if (pending.userData) {
        const { email, firstName, lastName, middleName, phoneNumber } = pending.userData;
        
        try {
          // Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email },
          });

          if (!existingUser) {
            await prisma.user.create({
              data: {
                email,
                firstName,
                lastName,
                middleName,
                phoneNumber,
                walletAddress, // Use extracted wallet address
              },
            });
            Logger.info(`Created user in database: ${email} with wallet: ${walletAddress}`);
          }
        } catch (dbError) {
          Logger.error('Error creating user in database:', dbError);
          
          // Add to retry queue if Grid account was created successfully
          if (walletAddress) {
            Logger.info(`Adding ${walletAddress} to retry queue due to database error`);
            addToRetryQueue(walletAddress, {
              email: email,
              firstName: firstName,
              lastName: lastName,
              middleName: middleName,
              phoneNumber: phoneNumber,
              walletAddress: walletAddress,
            });
          }
          
          // Don't fail the Grid account creation if DB creation fails
        }
      }

      await removePending(pendingKey);
      Logger.info(`Grid account created: ${authResult.data?.address}`);
      return res.status(201).json({ data: authResult.data });
    }

    Logger.error('Grid auth failed:', authResult);
    res
      .status(400)
      .json({ error: 'Grid authentication failed', details: authResult });
  } catch (error) {
    Logger.error('Error completing Grid account:', error);
    res.status(500).json({ error: 'Failed to complete Grid account' });
  }
};
