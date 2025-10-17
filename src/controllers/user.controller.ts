// src/controllers/user.controller.ts
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import Logger from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  userId: string;
}
import gridClient from '../lib/squad';
import { v4 as uuidv4 } from 'uuid';
import {
  savePending,
  getPending,
  removePending,
  PENDING_TTL_MS,
} from '../lib/gridSessions';
import {
  CreateUserInput,
  UpdateUserInput,
  InitiateGridAccountInput,
  CompleteGridAccountInput,
  UserLoginInput,
} from '../schemas/user.schemas';
import { generateToken } from '../middleware/auth.middleware';
import { CompleteLoginInput } from '../schemas/auth.schemas';

// Token mint addresses
const TOKEN_MINTS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC_DEVNET: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
  USDC_MAINNET: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Mainnet USDC
} as const;

// Helper function to validate Grid client configuration
const validateGridConfig = () => {
  const apiKey = process.env.GRID_API_KEY;
  const environment = process.env.GRID_ENVIRONMENT;
  
  if (!apiKey) {
    Logger.error('GRID_API_KEY environment variable is not set');
    return { valid: false, error: 'Grid API key not configured' };
  }
  
  if (!environment || !['sandbox', 'production'].includes(environment)) {
    Logger.error('GRID_ENVIRONMENT must be either "sandbox" or "production"');
    return { valid: false, error: 'Invalid Grid environment configuration' };
  }
  
  Logger.info(`Grid client configured: environment=${environment}, apiKey=${apiKey.substring(0, 8)}...`);
  return { valid: true };
};

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
        gridAddress: true,
        gridStatus: true,
        gridPolicies: true,
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
    
    // Decode URL-encoded email address
    const decodedEmail = decodeURIComponent(email);

    const user = await prisma.user.findUnique({
      where: { email: decodedEmail },
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
        gridAddress: true,
        gridStatus: true,
        gridPolicies: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    Logger.error('Error fetching user by email:', error);
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
        gridAddress: true,
        gridStatus: true,
        gridPolicies: true,
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
        gridAddress: true,
        gridStatus: true,
        gridPolicies: true,
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

    const user = await prisma.user.delete({
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
        gridAddress: true,
        gridStatus: true,
        gridPolicies: true,
      },
    });

    Logger.info(`Deleted user from database: ${user.email}`);
    res.status(200).json({ message: 'User deleted successfully', user });
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
                     // Store Grid account data
                     gridAddress: authResult.data?.address || null,
                     gridStatus: authResult.data?.status || null,
                     gridPolicies: authResult.data?.policies as any || undefined,
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
                     gridAddress: true,
                     gridStatus: true,
                     gridPolicies: true,
                   },
                 });

                 Logger.info(`Created user in database: ${email} with wallet: ${walletAddress} and Grid address: ${user.gridAddress}`);

                 // Clean up pending session
                 await removePending(pendingKey);

                 // Return user and Grid account details in the requested format
                 return res.status(201).json({ 
                   user: {
                     id: user.id,
                     email: user.email,
                     firstName: user.firstName,
                     lastName: user.lastName,
                     middleName: user.middleName,
                     phoneNumber: user.phoneNumber,
                     walletAddress: user.walletAddress,
                     role: user.role,
                     isActive: user.isActive,
                     createdAt: user.createdAt,
                     updatedAt: user.updatedAt,
                   },
                   gridAccount: {
                     address: user.gridAddress,
                     status: user.gridStatus,
                     policies: user.gridPolicies,
                   }
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

// Get user account balances (SOL and SPL tokens including USDC on devnet)
// Get user account balances directly from Solana blockchain
export const getUserBalances = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const { limit, offset, mint } = req.query; // Support query parameters

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        gridPolicies: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.gridAddress) {
      return res.status(400).json({ error: 'User does not have a Grid account address' });
    }

    // Validate Grid configuration
    const gridConfig = validateGridConfig();
    if (!gridConfig.valid) {
      Logger.error('Grid configuration validation failed:', gridConfig.error);
      return res.status(500).json({ 
        error: 'Grid service configuration error',
        details: gridConfig.error
      });
    }

    // Prepare query parameters for Grid API
    const queryParams: any = {};
    if (limit) queryParams.limit = parseInt(limit as string, 10);
    if (offset) queryParams.offset = parseInt(offset as string, 10);
    if (mint) queryParams.mint = mint as string;

    // Get account balances from Grid using the Grid account address
    Logger.info(`Fetching balances for Grid account: ${user.gridAddress}`, { queryParams });
    
    let balances;
    try {
      // Call Grid API with optional query parameters using Grid account address
      balances = await gridClient.getAccountBalances(user.gridAddress, queryParams);
      
      if (!balances?.success) {
        Logger.error('Failed to fetch account balances:', {
          success: balances?.success,
          error: balances?.error,
          data: balances?.data,
          gridAddress: user.gridAddress,
          queryParams
        });
        return res.status(500).json({ 
          error: 'Failed to fetch account balances',
          details: balances?.error || 'Unknown error'
        });
      }
      
      Logger.info('Successfully fetched balances from Grid API', {
        gridAddress: user.gridAddress,
        tokenCount: balances.data?.tokens?.length || 0,
        hasNative: !!(balances.data as any)?.native
      });
    } catch (gridError) {
      Logger.error('Grid API error:', {
        error: gridError,
        gridAddress: user.gridAddress,
        queryParams,
        message: gridError instanceof Error ? gridError.message : 'Unknown error'
      });
      return res.status(500).json({ 
        error: 'Failed to fetch account balances',
        details: gridError instanceof Error ? gridError.message : 'Grid API error'
      });
    }

    // Process the Grid response data
    const accountData = balances.data as any;
    if (!accountData) {
      Logger.warn('No account data received from Grid API');
      return res.status(500).json({ 
        error: 'No account data received',
        details: 'Grid API returned empty data'
      });
    }

    // Extract USDC balance specifically (devnet USDC)
    const usdcBalance = accountData.tokens?.find((token: any) => 
      token.mint === TOKEN_MINTS.USDC_DEVNET
    );

    // Extract SOL balance from native field
    const solBalance = accountData.native;

    // Calculate formatted balances
    const formatBalance = (balance: string | undefined, decimals: number) => {
      if (!balance) return '0';
      const numBalance = parseFloat(balance);
      return (numBalance / Math.pow(10, decimals)).toFixed(decimals);
    };

    const solFormatted = formatBalance(solBalance?.balance, solBalance?.decimals || 9);
    const usdcFormatted = formatBalance(usdcBalance?.balance, usdcBalance?.decimals || 6);

    Logger.info(`Fetched balances for user ${email}: SOL=${solFormatted}, USDC=${usdcFormatted} (Grid: ${user.gridAddress})`);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        walletAddress: user.walletAddress,
        gridAddress: user.gridAddress,
      },
      balances: {
        sol: {
          balance: solBalance?.balance || '0',
          formattedBalance: solFormatted,
          decimals: solBalance?.decimals || 9,
          mint: TOKEN_MINTS.SOL,
          symbol: 'SOL',
          uiAmount: parseFloat(solFormatted),
        },
        usdc: {
          balance: usdcBalance?.balance || '0',
          formattedBalance: usdcFormatted,
          decimals: usdcBalance?.decimals || 6,
          mint: TOKEN_MINTS.USDC_DEVNET,
          symbol: 'USDC',
          uiAmount: parseFloat(usdcFormatted),
        },
        summary: {
          totalTokens: accountData.tokens?.length || 0,
          hasNative: !!accountData.native,
          hasUsdc: !!usdcBalance,
          queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        },
        allTokens: accountData.tokens || [],
        native: accountData.native || null,
      },
    });
  } catch (error) {
    Logger.error('Error fetching user balances:', error);
    res.status(500).json({ error: 'Failed to fetch user balances' });
  }
};

// Get user account balances by wallet address (SOL and SPL tokens including USDC on devnet)
export const getUserBalancesByWallet = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const { limit, offset, mint } = req.query; // Support query parameters

    // Find user by wallet address
    const user = await prisma.user.findFirst({
      where: { walletAddress },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        gridPolicies: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.gridAddress) {
      return res.status(400).json({ error: 'User does not have a Grid account address' });
    }

    // Validate Grid configuration
    const gridConfig = validateGridConfig();
    if (!gridConfig.valid) {
      Logger.error('Grid configuration validation failed:', gridConfig.error);
      return res.status(500).json({ 
        error: 'Grid service configuration error',
        details: gridConfig.error
      });
    }

    // Prepare query parameters for Grid API
    const queryParams: any = {};
    if (limit) queryParams.limit = parseInt(limit as string, 10);
    if (offset) queryParams.offset = parseInt(offset as string, 10);
    if (mint) queryParams.mint = mint as string;

    // Get account balances from Grid using the Grid account address
    Logger.info(`Fetching balances for Grid account: ${user.gridAddress}`, { queryParams });
    
    let balances;
    try {
      // Call Grid API with optional query parameters using Grid account address
      balances = await gridClient.getAccountBalances(user.gridAddress, queryParams);
      
      if (!balances?.success) {
        Logger.error('Failed to fetch account balances:', {
          success: balances?.success,
          error: balances?.error,
          data: balances?.data,
          gridAddress: user.gridAddress,
          queryParams
        });
        return res.status(500).json({ 
          error: 'Failed to fetch account balances',
          details: balances?.error || 'Unknown error'
        });
      }
      
      Logger.info('Successfully fetched balances from Grid API', {
        gridAddress: user.gridAddress,
        tokenCount: balances.data?.tokens?.length || 0,
        hasNative: !!(balances.data as any)?.native
      });
    } catch (gridError) {
      Logger.error('Grid API error:', {
        error: gridError,
        gridAddress: user.gridAddress,
        queryParams,
        message: gridError instanceof Error ? gridError.message : 'Unknown error'
      });
      return res.status(500).json({ 
        error: 'Failed to fetch account balances',
        details: gridError instanceof Error ? gridError.message : 'Grid API error'
      });
    }

    // Process the Grid response data
    const accountData = balances.data as any;
    if (!accountData) {
      Logger.warn('No account data received from Grid API');
      return res.status(500).json({ 
        error: 'No account data received',
        details: 'Grid API returned empty data'
      });
    }

    // Extract USDC balance specifically (devnet USDC)
    const usdcBalance = accountData.tokens?.find((token: any) => 
      token.mint === TOKEN_MINTS.USDC_DEVNET
    );

    // Extract SOL balance from native field
    const solBalance = accountData.native;

    // Calculate formatted balances
    const formatBalance = (balance: string | undefined, decimals: number) => {
      if (!balance) return '0';
      const numBalance = parseFloat(balance);
      return (numBalance / Math.pow(10, decimals)).toFixed(decimals);
    };

    const solFormatted = formatBalance(solBalance?.balance, solBalance?.decimals || 9);
    const usdcFormatted = formatBalance(usdcBalance?.balance, usdcBalance?.decimals || 6);

    Logger.info(`Fetched balances for wallet ${walletAddress}: SOL=${solFormatted}, USDC=${usdcFormatted} (Grid: ${user.gridAddress})`);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        walletAddress: user.walletAddress,
        gridAddress: user.gridAddress,
      },
      balances: {
        sol: {
          balance: solBalance?.balance || '0',
          formattedBalance: solFormatted,
          decimals: solBalance?.decimals || 9,
          mint: TOKEN_MINTS.SOL,
          symbol: 'SOL',
          uiAmount: parseFloat(solFormatted),
        },
        usdc: {
          balance: usdcBalance?.balance || '0',
          formattedBalance: usdcFormatted,
          decimals: usdcBalance?.decimals || 6,
          mint: TOKEN_MINTS.USDC_DEVNET,
          symbol: 'USDC',
          uiAmount: parseFloat(usdcFormatted),
        },
        summary: {
          totalTokens: accountData.tokens?.length || 0,
          hasNative: !!accountData.native,
          hasUsdc: !!usdcBalance,
          queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        },
        allTokens: accountData.tokens || [],
        native: accountData.native || null,
      },
    });
  } catch (error) {
    Logger.error('Error fetching balances by wallet address:', error);
    res.status(500).json({ error: 'Failed to fetch balances by wallet address' });
  }
};

// Debug endpoint to check raw Grid API response for a specific user
export const updateUserGridData = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const { gridAddress, gridStatus, gridPolicies } = req.body;

    if (!gridAddress) {
      return res.status(400).json({ error: 'Grid address is required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        gridPolicies: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user with Grid account data
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        gridAddress,
        gridStatus: gridStatus || 'success',
        gridPolicies: gridPolicies as any || undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        gridPolicies: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    Logger.info(`Updated user ${email} with Grid account data: ${gridAddress}`);

    res.json({
      message: 'User Grid account data updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    Logger.error('Error updating user Grid account data:', error);
    res.status(500).json({ error: 'Failed to update user Grid account data' });
  }
};

export const debugUserBalances = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        gridPolicies: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.gridAddress) {
      return res.status(400).json({ error: 'User does not have a Grid account address' });
    }

    // Validate Grid configuration
    const gridConfig = validateGridConfig();
    if (!gridConfig.valid) {
      return res.status(500).json({ 
        error: 'Grid service configuration error',
        details: gridConfig.error
      });
    }

    // Get raw account balances from Grid
    Logger.info(`Debug: Fetching raw balances for Grid account: ${user.gridAddress}`);
    
    let balances;
    try {
      balances = await gridClient.getAccountBalances(user.gridAddress);
      
      Logger.info('Debug: Raw Grid API response:', {
        success: balances?.success,
        error: balances?.error,
        data: balances?.data,
        gridAddress: user.gridAddress
      });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          walletAddress: user.walletAddress,
          gridAddress: user.gridAddress,
          gridStatus: user.gridStatus,
          gridPolicies: user.gridPolicies,
        },
        debug: {
          gridApiSuccess: balances?.success,
          gridApiError: balances?.error,
          rawGridResponse: balances?.data,
          tokenCount: balances?.data?.tokens?.length || 0,
          hasNative: !!(balances?.data as any)?.native,
          nativeBalance: (balances?.data as any)?.native,
          allTokens: balances?.data?.tokens || [],
        }
      });
    } catch (gridError) {
      Logger.error('Debug: Grid API error:', {
        error: gridError,
        gridAddress: user.gridAddress,
        message: gridError instanceof Error ? gridError.message : 'Unknown error'
      });
      
      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          walletAddress: user.walletAddress,
          gridAddress: user.gridAddress,
          gridStatus: user.gridStatus,
          gridPolicies: user.gridPolicies,
        },
        debug: {
          gridApiSuccess: false,
          gridApiError: gridError instanceof Error ? gridError.message : 'Unknown error',
          rawGridResponse: null,
          error: gridError
        }
      });
    }
  } catch (error) {
    Logger.error('Debug: Error in debugUserBalances:', error);
    res.status(500).json({ error: 'Failed to debug user balances' });
  }
};

// Regular login process
export const login = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as UserLoginInput;

    // Check if user exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        isActive: true,
      },
    });

    if (!existingUser) {
      return res.status(401).json({
        message: "User doesn't exist. Please sign up before proceeding",
      });
    }

    if (!existingUser.isActive) {
      return res.status(401).json({
        message: 'Account is inactive. Please contact support.',
      });
    }

    // Generate JWT token
    const token = generateToken(existingUser.id);

    Logger.info(`Login successful for user ${email}`);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: existingUser.id,
        email: existingUser.email,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        walletAddress: existingUser.walletAddress,
        gridAddress: existingUser.gridAddress,
        gridStatus: existingUser.gridStatus,
      },
    });
  } catch (error) {
    Logger.error('Error initiating login:', error);
    res.status(500).json({ error: 'Failed to initiate login process' });
  }
};

// Initiate Grid-based login (sends OTP email)
export const initiateLogin = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as UserLoginInput;

    // Check if user exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        isActive: true,
      },
    });

    if (!existingUser) {
      return res.status(401).json({
        message: "User doesn't exist. Please sign up before proceeding",
      });
    }

    if (!existingUser.isActive) {
      return res.status(401).json({
        message: 'Account is inactive. Please contact support.',
      });
    }

    // Create Grid authentication session
    const response = await gridClient.createAccount({ email });
    const user = response.data;

    const sessionSecrets = await gridClient.generateSessionSecrets();

    const pendingKey = uuidv4();
    const createdAt = Date.now();
    await savePending(pendingKey, {
      user: existingUser, // Use existing user data
      sessionSecrets,
      createdAt,
    });

    const expiresAt = new Date(createdAt + PENDING_TTL_MS).toISOString();
    const maskedKey = `${pendingKey.slice(0, 8)}...${pendingKey.slice(-4)}`;

    Logger.info(`Initiated Grid login for user ${email}, pendingKey=${pendingKey}`);

    res.status(201).json({ 
      message: 'OTP sent to your email. Please check your inbox.',
      pendingKey, 
      maskedKey, 
      expiresAt 
    });
  } catch (error) {
    Logger.error('Error initiating Grid login:', error);
    res.status(500).json({ error: 'Failed to initiate Grid login process' });
  }
};

export const completeLogin = async (req: Request, res: Response) => {
  try {
    const { pendingKey, otpCode } = req.body as CompleteLoginInput;

    const pending = await getPending(pendingKey);
    if (!pending) {
      return res
        .status(410)
        .json({ error: 'Pending session not found or expired' });
    }

    const sessionSecrets = await gridClient.generateSessionSecrets();

    const authResult = await gridClient.completeAuth({
      user: pending.user,
      otpCode,
      sessionSecrets,
    });

    if (!authResult?.success) {
      Logger.error('Grid authentication completion failed:', authResult);
      return res.status(401).json({
        error: 'Authentication failed',
        details: authResult?.error || 'Invalid verification code',
      });
    }

    // Generate JWT token
    const token = generateToken(pending.user.id);

    // Clean up pending session
    await removePending(pendingKey);

    Logger.info(`Login completed successfully for user ${pending.user.email}`);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: pending.user.id,
        email: pending.user.email,
        firstName: pending.user.firstName,
        lastName: pending.user.lastName,
        walletAddress: pending.user.walletAddress,
        gridAddress: pending.user.gridAddress,
        gridStatus: pending.user.gridStatus,
      },
    });
  } catch (error) {
    Logger.error('Error completing login:', error);
    res.status(500).json({ error: 'Failed to complete login process' });
  }
};

// NEW GRID SDK-BASED AUTHENTICATION SYSTEM
// Initialize Grid authentication for existing users
export const initGridAuth = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as UserLoginInput;

    // Check if user exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        isActive: true,
      },
    });

    if (!existingUser) {
      return res.status(401).json({
        message: "User doesn't exist. Please sign up before proceeding",
      });
    }

    if (!existingUser.isActive) {
      return res.status(401).json({
        message: 'Account is inactive. Please contact support.',
      });
    }

    // Initialize Grid authentication using initAuth
    const authResult = await gridClient.initAuth({
      email: existingUser.email,
    });

    if (!authResult?.success) {
      Logger.error('Grid initAuth failed:', authResult);
      return res.status(500).json({
        error: 'Failed to initialize Grid authentication',
        details: authResult?.error || 'Grid authentication initialization failed',
      });
    }

    // Store pending session for completion
    const pendingKey = uuidv4();
    const createdAt = Date.now();
    await savePending(pendingKey, {
      user: existingUser,
      sessionSecrets: null, // Grid SDK initAuth doesn't return sessionSecrets
      createdAt,
    });

    const expiresAt = new Date(createdAt + PENDING_TTL_MS).toISOString();
    const maskedKey = `${pendingKey.slice(0, 8)}...${pendingKey.slice(-4)}`;

    Logger.info(`Grid initAuth successful for user ${email}, pendingKey=${pendingKey}`);

    res.status(201).json({
      message: 'Grid authentication initialized successfully',
      pendingKey,
      maskedKey,
      expiresAt,
      authData: {
        success: authResult.success,
        data: authResult.data,
      },
    });
  } catch (error) {
    Logger.error('Error initializing Grid authentication:', error);
    res.status(500).json({ error: 'Failed to initialize Grid authentication' });
  }
};

// Complete Grid SDK authentication
export const completeGridAuth = async (req: Request, res: Response) => {
  try {
    const { pendingKey, otpCode } = req.body as CompleteLoginInput;

    const pending = await getPending(pendingKey);
    if (!pending) {
      return res
        .status(410)
        .json({ error: 'Pending session not found or expired' });
    }

    // Complete Grid authentication using the stored session
    const authResult = await gridClient.completeAuth({
      user: pending.user,
      otpCode,
      sessionSecrets: pending.sessionSecrets || await gridClient.generateSessionSecrets(),
    });

    if (!authResult?.success) {
      Logger.error('Grid authentication completion failed:', authResult);
      return res.status(401).json({
        error: 'Authentication failed',
        details: authResult?.error || 'Invalid verification code',
      });
    }

    // Generate JWT token
    const token = generateToken(pending.user.id);

    // Clean up pending session
    await removePending(pendingKey);

    Logger.info(`Grid authentication completed successfully for user ${pending.user.email}`);

    return res.status(200).json({
      message: 'Grid authentication successful',
      token,
      user: {
        id: pending.user.id,
        email: pending.user.email,
        firstName: pending.user.firstName,
        lastName: pending.user.lastName,
        walletAddress: pending.user.walletAddress,
        gridAddress: pending.user.gridAddress,
        gridStatus: pending.user.gridStatus,
      },
      authData: {
        success: authResult.success,
        data: authResult.data,
      },
    });
  } catch (error) {
    Logger.error('Error completing Grid authentication:', error);
    res.status(500).json({ error: 'Failed to complete Grid authentication' });
  }
};

// Get current authenticated user
export const getCurrentUser = async (
  req: Request,
  res: Response
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).userId },
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
        gridAddress: true,
        gridStatus: true,
        gridPolicies: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    Logger.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch user information' });
  }
};

// Test Grid configuration endpoint (for debugging)
export const testGridConfig = async (req: Request, res: Response) => {
  try {
    const gridConfig = validateGridConfig();
    
    if (!gridConfig.valid) {
      return res.status(500).json({
        error: 'Grid configuration invalid',
        details: gridConfig.error,
        environment: process.env.GRID_ENVIRONMENT,
        hasApiKey: !!process.env.GRID_API_KEY,
        apiKeyLength: process.env.GRID_API_KEY?.length || 0
      });
    }

    // Try a simple Grid API call to test connectivity
    try {
      // Test with a known Solana address (this might fail but will show us the error)
      const testAddress = '11111111111111111111111111111112'; // System program address
      Logger.info(`Testing Grid API with address: ${testAddress}`);
      
      const testBalances = await gridClient.getAccountBalances(testAddress);
      
      res.json({
        status: 'success',
        message: 'Grid configuration is valid',
        environment: process.env.GRID_ENVIRONMENT,
        hasApiKey: !!process.env.GRID_API_KEY,
        apiKeyLength: process.env.GRID_API_KEY?.length || 0,
        testResult: {
          success: testBalances?.success,
          error: testBalances?.error,
          hasData: !!testBalances?.data
        }
      });
    } catch (testError) {
      res.json({
        status: 'partial',
        message: 'Grid configuration is valid but API call failed',
        environment: process.env.GRID_ENVIRONMENT,
        hasApiKey: !!process.env.GRID_API_KEY,
        apiKeyLength: process.env.GRID_API_KEY?.length || 0,
        testError: testError instanceof Error ? testError.message : 'Unknown error'
      });
    }
  } catch (error) {
    Logger.error('Error testing Grid configuration:', error);
    res.status(500).json({
      error: 'Failed to test Grid configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};