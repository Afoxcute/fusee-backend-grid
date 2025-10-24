// src/controllers/user.controller.ts
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import Logger from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  userId: string;
}
import gridClient from '../lib/squad';
// Pending key utilities removed - no longer needed
import {
  CreateUserInput,
  UpdateUserInput,
  InitiateGridAccountInput,
  CompleteGridAccountInput,
  UserLoginInput,
} from '../schemas/user.schemas';
import { generateToken } from '../middleware/auth.middleware';
import { CompleteLoginInput } from '../schemas/auth.schemas';
import { blockchainService } from '../services/blockchain.service';
// Transaction schemas import
import {
  PrepareTransactionInput,
  ExecuteTransactionInput,
  SendTransactionInput,
  SendSolTransactionInput,
  SendUsdcTransactionInput,
} from '../schemas/transaction.schemas';

// Utility function to validate base64 transaction data
const validateBase64Transaction = (transactionData: string): { isValid: boolean; error?: string } => {
  if (!transactionData || typeof transactionData !== 'string') {
    return { isValid: false, error: 'Transaction data is not a string' };
  }

  if (transactionData.length === 0) {
    return { isValid: false, error: 'Transaction data is empty' };
  }

  // Validate base64 format
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(transactionData)) {
    return { isValid: false, error: 'Transaction data is not valid base64' };
  }

  // Check if it's a reasonable length for a Solana transaction
  if (transactionData.length < 100) {
    return { isValid: false, error: 'Transaction data is too short to be a valid Solana transaction' };
  }

  return { isValid: true };
};

// Token mint addresses
const TOKEN_MINTS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC_DEVNET: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
  USDC_MAINNET: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Mainnet USDC
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
        authResult: true,
        sessionSecrets: true,
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
        authResult: true,
        sessionSecrets: true,
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
        authResult: true,
        sessionSecrets: true,
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
        authResult: true,
        sessionSecrets: true,
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
        authResult: true,
        sessionSecrets: true,
      },
    });

    Logger.info(`Deleted user from database: ${user.email}`);
    res.status(200).json({ message: 'User deleted successfully', user });
  } catch (error) {
    Logger.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Initiate Grid account creation (simplified - no pending key)
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

    // Create account and get OTP (simplified approach)
    const accountCreation = await gridClient.createAccount({ 
      type: 'email',
      email: email 
    });

    if (!accountCreation?.success) {
      Logger.error('Grid account creation failed:', accountCreation);
      
      // Check if the error is because the email already has a Grid account
      if (accountCreation?.error?.includes('Email associated with grid account already exists')) {
        return res.status(409).json({
          error: 'Grid account already exists for this email',
          details: 'A Grid account already exists for this email. You can complete the account setup using the complete endpoint.',
          field: 'email',
          guidance: {
            message: 'This email already has a Grid account but no user record in our database.',
            action: 'Use the complete endpoint to finish account setup',
            endpoint: '/api/users/grid/complete',
            requiredFields: ['email', 'otpCode', 'firstName', 'lastName', 'middleName', 'phoneNumber']
          }
        });
      }
      
      return res.status(500).json({
        error: 'Failed to create Grid account',
        details: accountCreation?.error || 'Account creation failed'
      });
    }

    Logger.info(`Grid account creation initiated for user ${email}`);

    res.status(201).json({ 
      message: 'Account creation initiated successfully',
      email: email,
      instructions: 'Check your email for the OTP code and use it with the complete endpoint'
    });
  } catch (error) {
    Logger.error('Error initiating Grid account:', error);
    res.status(500).json({ error: 'Failed to initiate Grid account' });
  }
};

// Request OTP for existing Grid account (for completing account setup)
export const requestOtpForExistingAccount = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email: string };
    
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    // Check if user already exists in database
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User account already exists',
        message: 'User account already exists in database. Use the login endpoint instead.',
        guidance: {
          action: 'Use the login endpoint',
          endpoint: '/api/users/login'
        }
      });
    }

    // Try to initiate authentication for existing Grid account
    try {
      const authResult = await gridClient.initAuth({
        email: email,
      });

      if (authResult?.success) {
        Logger.info(`OTP sent for existing Grid account: ${email}`);
        return res.status(200).json({
          message: 'OTP sent successfully for existing Grid account',
          email: email,
          instructions: 'Check your email for the OTP code and use it with the complete endpoint',
          guidance: {
            action: 'Complete account setup',
            endpoint: '/api/users/grid/complete',
            requiredFields: ['email', 'otpCode', 'firstName', 'lastName', 'middleName', 'phoneNumber']
          }
        });
      } else {
        Logger.error('Failed to send OTP for existing account:', authResult);
        return res.status(500).json({
          error: 'Failed to send OTP',
          details: authResult?.error || 'OTP sending failed'
        });
      }
    } catch (gridError: any) {
      Logger.error('Error requesting OTP for existing account:', gridError);
      
      // Check if the error indicates the account doesn't exist
      if (gridError?.message?.includes('Email associated with grid account already exists') ||
          gridError?.error?.includes('Email associated with grid account already exists')) {
        
        return res.status(409).json({
          error: 'Grid account already exists',
          message: 'A Grid account exists for this email but OTP request failed.',
          details: 'This might indicate an issue with the Grid account state.',
          guidance: {
            action: 'Try the complete endpoint directly or contact support',
            endpoint: '/api/users/grid/complete'
          }
        });
      }
      
      return res.status(500).json({
        error: 'Failed to request OTP',
        details: gridError?.message || 'Unknown error occurred'
      });
    }

  } catch (error) {
    Logger.error('Error requesting OTP for existing account:', error);
    res.status(500).json({ error: 'Failed to request OTP for existing account' });
  }
};

// Check if a Grid account exists for an email (helper endpoint)
export const checkGridAccountStatus = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email: string };
    
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    // Check if user exists in database
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
        authResult: true,
        sessionSecrets: true,
        isActive: true,
      },
    });

    if (existingUser) {
      return res.status(200).json({
        status: 'user_exists',
        message: 'User account exists in database',
        user: existingUser,
        guidance: {
          message: 'User account already exists. You can log in directly.',
          action: 'Use the login endpoint',
          endpoint: '/api/users/login'
        }
      });
    }

    // Try to initiate account creation to see if Grid account exists
    try {
      const accountCreation = await gridClient.createAccount({ 
        type: 'email',
        email: email 
      });

      if (accountCreation?.success) {
        return res.status(200).json({
          status: 'grid_account_available',
          message: 'No user record exists, but Grid account creation is available',
          guidance: {
            message: 'You can create a new Grid account.',
            action: 'Use the initiate endpoint to start account creation',
            endpoint: '/api/users/grid/initiate',
            requiredFields: ['email', 'firstName', 'lastName', 'middleName', 'phoneNumber']
          }
        });
      }
    } catch (gridError: any) {
      // Check if the error is because the email already has a Grid account
      if (gridError?.message?.includes('Email associated with grid account already exists') ||
          gridError?.error?.includes('Email associated with grid account already exists')) {
        
        return res.status(200).json({
          status: 'grid_account_exists',
          message: 'Grid account exists but no user record in database',
          guidance: {
            message: 'A Grid account exists for this email but no user record in our database.',
            action: 'Complete account setup using the complete endpoint',
            endpoint: '/api/users/grid/complete',
            requiredFields: ['email', 'otpCode', 'firstName', 'lastName', 'middleName', 'phoneNumber'],
            note: 'You will need to request an OTP first using the initiate endpoint'
          }
        });
      }
    }

    return res.status(200).json({
      status: 'unknown',
      message: 'Unable to determine account status',
      guidance: {
        message: 'Unable to determine if account exists. Try creating a new account.',
        action: 'Use the initiate endpoint to start account creation',
        endpoint: '/api/users/grid/initiate'
      }
    });

  } catch (error) {
    Logger.error('Error checking Grid account status:', error);
    res.status(500).json({ error: 'Failed to check account status' });
  }
};

// Complete Grid account creation (simplified - no pending key)
export const completeGridAccount = async (req: Request, res: Response) => {
  try {
    const validatedData = req.body as CompleteGridAccountInput;
    const { email, otpCode, firstName, lastName, middleName, phoneNumber } = validatedData;

    if (!email || !otpCode) {
      return res.status(400).json({ 
        error: 'Email and OTP code are required' 
      });
    }

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

    // Generate session secrets for the new account
    const sessionSecrets = await gridClient.generateSessionSecrets();

    // Create a temporary user context for Grid SDK
    const tempUser = {
      email: email,
      grid_user_id: undefined, // Use undefined instead of null
      signers: [], // Empty signers array for new account
    };

    // Try to complete Grid account authentication/creation
    let authResult;
    
    // First try authentication (for existing accounts)
    try {
      Logger.info(`Attempting authentication for existing Grid account: ${email}`);
      authResult = await gridClient.completeAuth({
        user: tempUser,
        otpCode,
        sessionSecrets,
      });
      
      if (authResult?.success) {
        Logger.info(`Successfully authenticated existing Grid account: ${email}`);
      }
    } catch (authError: any) {
      Logger.warn(`Authentication failed for ${email}, trying account creation:`, {
        error: authError,
        message: authError?.message,
        errorString: authError?.error
      });
      
      // If authentication fails, try account creation (for new accounts)
      try {
        Logger.info(`Attempting account creation for new Grid account: ${email}`);
        authResult = await gridClient.completeAuthAndCreateAccount({
          user: tempUser,
          otpCode,
          sessionSecrets,
        });
        
        if (authResult?.success) {
          Logger.info(`Successfully created new Grid account: ${email}`);
        }
      } catch (createError: any) {
        Logger.error('Both authentication and account creation failed:', {
          authError: authError,
          createError: createError,
          email: email
        });
        
        // Return detailed error information
        return res.status(500).json({
          error: 'Failed to complete Grid account setup',
          details: 'Both authentication and account creation failed',
          authError: authError?.message || authError?.error || 'Authentication failed',
          createError: createError?.message || createError?.error || 'Account creation failed',
          guidance: {
            message: 'Unable to complete account setup. Please check your OTP code and try again.',
            action: 'Verify OTP code and retry',
            endpoint: '/api/users/grid/complete'
          }
        });
      }
    }

    if (authResult?.success) {
      // Extract wallet address from Grid response
      const walletAddress = extractWalletAddress(authResult);
      
      if (!walletAddress) {
        Logger.error('Failed to extract wallet address from Grid response');
        return res.status(500).json({ error: 'Failed to extract wallet address from Grid account' });
      }

      try {
        const user = await prisma.user.create({
          data: {
            email,
            firstName: firstName || '',
            lastName: lastName || '',
            middleName: middleName || null,
            phoneNumber: phoneNumber || null,
            walletAddress, // Use extracted wallet address
            role: 'USER',
            isActive: true,
            // Store Grid account data
            gridAddress: authResult.data?.address || null,
            gridStatus: 'success', // Default to success since authentication was successful
            // Store Grid authentication data
            authResult: authResult.data as any || null,
            sessionSecrets: sessionSecrets as any || null,
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
            authResult: true,
            sessionSecrets: true,
          },
        });

        Logger.info(`Created user in database: ${email} with wallet: ${walletAddress} and Grid address: ${user.gridAddress}`);

        // Return user and Grid account details in the simplified format
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
            gridAddress: user.gridAddress,
            gridStatus: user.gridStatus,
            authResult: user.authResult,
            sessionSecrets: user.sessionSecrets,
          }
        });
      } catch (dbError) {
        Logger.error('Database error during user creation:', dbError);
        
        res.status(500).json({ 
          error: 'Failed to create user in database',
          gridAccount: {
            address: authResult.data?.address || '',
            status: 'success', // Default to success since authentication was successful
            policies: authResult.data?.policies || {},
          }
        });
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

// Get user account balances directly from Solana blockchain
export const getUserBalances = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const { limit = 10, offset = 0, mint } = req.query;

    // Decode URL-encoded email address
    const decodedEmail = decodeURIComponent(email);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: decodedEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        authResult: true,
        sessionSecrets: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Use Grid address for balance queries (Grid-to-Grid system)
    const gridAddress = user.gridAddress;
    
    if (!gridAddress) {
      return res.status(400).json({ 
        error: 'User does not have a Grid account',
        details: 'User must have a Grid account to fetch balances'
      });
    }

    Logger.info(`Fetching Grid account balances for user ${email} (Grid address: ${gridAddress})`);

    // Prepare query parameters for Grid SDK
    const queryParams: any = {
      limit: Number(limit),
      offset: Number(offset),
    };

    // Add mint filter if provided
    if (mint && typeof mint === 'string') {
      queryParams.mint = mint;
    }

    // Get account balances using Grid SDK
    const balancesResponse = await gridClient.getAccountBalances(gridAddress, queryParams);

    if (!balancesResponse?.success) {
      Logger.error('Grid SDK balance fetch failed:', balancesResponse?.error);
      return res.status(500).json({
        error: 'Failed to fetch balances from Grid SDK',
        details: balancesResponse?.error || 'Grid SDK balance fetch failed'
      });
    }

    const balancesData = balancesResponse.data;
    Logger.info(`Fetched Grid balances for user ${email}:`, {
      success: balancesResponse.success,
      hasData: !!balancesData,
      tokenCount: balancesData?.tokens?.length || 0
    });

    // Process the Grid SDK response to match our expected format
    // Note: Using type assertion to handle Grid SDK response structure
    const processedBalances = {
      sol: {
        balance: (balancesData as any)?.native?.balance || '0',
        formattedBalance: (balancesData as any)?.native?.formattedBalance || '0',
        decimals: (balancesData as any)?.native?.decimals || 9,
        mint: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        uiAmount: parseFloat((balancesData as any)?.native?.formattedBalance || '0')
      },
      usdc: {
        balance: '0',
        formattedBalance: '0',
        decimals: 6,
        mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        symbol: 'USDC',
        uiAmount: 0
      },
      summary: {
        totalTokens: balancesData?.tokens?.length || 0,
        hasNative: !!((balancesData as any)?.native?.balance && (balancesData as any).native.balance !== '0'),
        hasUsdc: false,
        queryParams: queryParams,
        source: 'grid-sdk',
        gridAddress: gridAddress
      },
      allTokens: balancesData?.tokens || [],
      native: (balancesData as any)?.native || null
    };

    // Find USDC token in the tokens array
    if (balancesData?.tokens) {
      const usdcToken = balancesData.tokens.find((token: any) => 
        token.mint === '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
      );
      
      if (usdcToken) {
        processedBalances.usdc = {
          balance: (usdcToken as any).balance || '0',
          formattedBalance: (usdcToken as any).formattedBalance || '0',
          decimals: (usdcToken as any).decimals || 6,
          mint: (usdcToken as any).mint,
          symbol: (usdcToken as any).symbol || 'USDC',
          uiAmount: parseFloat((usdcToken as any).formattedBalance || '0')
        };
        processedBalances.summary.hasUsdc = parseFloat((usdcToken as any).formattedBalance || '0') > 0;
      }
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        walletAddress: user.walletAddress,
        gridAddress: user.gridAddress,
      },
      balances: processedBalances,
      gridResponse: {
        success: balancesResponse.success,
        data: balancesData
      }
    });
  } catch (error) {
    Logger.error('Error fetching user balances from Grid SDK:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user balances from Grid SDK',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get user account balances by wallet address using Grid SDK
export const getUserBalancesByWallet = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const { limit = 10, offset = 0, mint } = req.query;

    // Validate wallet address format
    if (!blockchainService.isValidWalletAddress(walletAddress)) {
      return res.status(400).json({ 
        error: 'Invalid wallet address format',
        details: 'Wallet address must be a valid Solana public key'
      });
    }

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
        authResult: true,
        sessionSecrets: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Use Grid address for balance queries (Grid-to-Grid system)
    const gridAddress = user.gridAddress;
    
    if (!gridAddress) {
      return res.status(400).json({ 
        error: 'User does not have a Grid account',
        details: 'User must have a Grid account to fetch balances'
      });
    }

    Logger.info(`Fetching Grid account balances for wallet: ${walletAddress} (Grid address: ${gridAddress})`);

    // Prepare query parameters for Grid SDK
    const queryParams: any = {
      limit: Number(limit),
      offset: Number(offset),
    };

    // Add mint filter if provided
    if (mint && typeof mint === 'string') {
      queryParams.mint = mint;
    }

    // Get account balances using Grid SDK
    const balancesResponse = await gridClient.getAccountBalances(gridAddress, queryParams);

    if (!balancesResponse?.success) {
      Logger.error('Grid SDK balance fetch failed:', balancesResponse?.error);
      return res.status(500).json({
        error: 'Failed to fetch balances from Grid SDK',
        details: balancesResponse?.error || 'Grid SDK balance fetch failed'
      });
    }

    const balancesData = balancesResponse.data;
    Logger.info(`Fetched Grid balances for wallet ${walletAddress}:`, {
      success: balancesResponse.success,
      hasData: !!balancesData,
      tokenCount: balancesData?.tokens?.length || 0
    });

    // Process the Grid SDK response to match our expected format
    // Note: Using type assertion to handle Grid SDK response structure
    const processedBalances = {
      sol: {
        balance: (balancesData as any)?.native?.balance || '0',
        formattedBalance: (balancesData as any)?.native?.formattedBalance || '0',
        decimals: (balancesData as any)?.native?.decimals || 9,
        mint: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        uiAmount: parseFloat((balancesData as any)?.native?.formattedBalance || '0')
      },
      usdc: {
        balance: '0',
        formattedBalance: '0',
        decimals: 6,
        mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        symbol: 'USDC',
        uiAmount: 0
      },
      summary: {
        totalTokens: balancesData?.tokens?.length || 0,
        hasNative: !!((balancesData as any)?.native?.balance && (balancesData as any).native.balance !== '0'),
        hasUsdc: false,
        queryParams: queryParams,
        source: 'grid-sdk',
        walletAddress: walletAddress,
        gridAddress: gridAddress
      },
      allTokens: balancesData?.tokens || [],
      native: (balancesData as any)?.native || null
    };

    // Find USDC token in the tokens array
    if (balancesData?.tokens) {
      const usdcToken = balancesData.tokens.find((token: any) => 
        token.mint === '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
      );
      
      if (usdcToken) {
        processedBalances.usdc = {
          balance: (usdcToken as any).balance || '0',
          formattedBalance: (usdcToken as any).formattedBalance || '0',
          decimals: (usdcToken as any).decimals || 6,
          mint: (usdcToken as any).mint,
          symbol: (usdcToken as any).symbol || 'USDC',
          uiAmount: parseFloat((usdcToken as any).formattedBalance || '0')
        };
        processedBalances.summary.hasUsdc = parseFloat((usdcToken as any).formattedBalance || '0') > 0;
      }
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        walletAddress: user.walletAddress,
        gridAddress: user.gridAddress,
      },
      balances: processedBalances,
      gridResponse: {
        success: balancesResponse.success,
        data: balancesData
      }
    });
  } catch (error) {
    Logger.error('Error fetching balances by wallet address from Grid SDK:', error);
    res.status(500).json({ 
      error: 'Failed to fetch balances by wallet address from Grid SDK',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Debug endpoint to check raw Grid API response for a specific user
export const updateUserGridData = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const { gridAddress, gridStatus, authResult, sessionSecrets } = req.body;

    // Decode URL-encoded email address
    const decodedEmail = decodeURIComponent(email);

    if (!gridAddress) {
      return res.status(400).json({ error: 'Grid address is required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: decodedEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        authResult: true,
        sessionSecrets: true,
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
        authResult: authResult as any || undefined,
        sessionSecrets: sessionSecrets as any || undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        authResult: true,
        sessionSecrets: true,
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

    // Decode URL-encoded email address
    const decodedEmail = decodeURIComponent(email);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: decodedEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        authResult: true,
        sessionSecrets: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Use Grid address for balance queries (Grid-to-Grid system)
    const gridAddress = user.gridAddress;
    
    if (!gridAddress) {
      return res.status(400).json({ 
        error: 'User does not have a Grid account',
        details: 'User must have a Grid account to fetch balances'
      });
    }

    Logger.info(`Debug: Fetching Grid account balances for user ${email} (Grid address: ${gridAddress})`);

    // Get account balances using Grid SDK
    const balancesResponse = await gridClient.getAccountBalances(gridAddress);

    if (!balancesResponse?.success) {
      Logger.error('Debug: Grid SDK balance fetch failed:', balancesResponse?.error);
      return res.status(500).json({
        error: 'Failed to fetch balances from Grid SDK',
        details: balancesResponse?.error || 'Grid SDK balance fetch failed'
      });
    }

    const balancesData = balancesResponse.data;
    Logger.info('Debug: Grid balances fetched:', {
      email,
      gridAddress,
      success: balancesResponse.success,
      hasData: !!balancesData,
      tokenCount: balancesData?.tokens?.length || 0,
      nativeBalance: (balancesData as any)?.native?.formattedBalance || '0',
      tokens: balancesData?.tokens?.map((token: any) => ({
        mint: token.mint,
        symbol: token.symbol,
        balance: token.formattedBalance
      })) || []
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
        authResult: user.authResult,
        sessionSecrets: user.sessionSecrets,
      },
      debug: {
        gridAddress,
        source: 'grid-sdk',
        gridResponse: {
          success: balancesResponse.success,
          data: balancesData
        },
        rawGridData: balancesData
      }
    });
  } catch (error) {
    Logger.error('Debug: Error fetching user balances from Grid SDK:', error);
    res.status(500).json({ 
      error: 'Failed to debug user balances from Grid SDK',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get user transfer history using Grid SDK
export const getUserTransfers = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const { 
      limit = 10, 
      offset = 0, 
      startDate, 
      endDate, 
      tokenMint,
      direction 
    } = req.query;

    // Decode URL-encoded email address
    const decodedEmail = decodeURIComponent(email);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: decodedEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        authResult: true,
        sessionSecrets: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Use Grid address for transfer queries (Grid-to-Grid system)
    const gridAddress = user.gridAddress;
    
    if (!gridAddress) {
      return res.status(400).json({ 
        error: 'User does not have a Grid account',
        details: 'User must have a Grid account to fetch transfer history'
      });
    }

    Logger.info(`Fetching Grid transfer history for user ${email} (Grid address: ${gridAddress})`);

    // Prepare options for Grid SDK
    const options: any = {
      limit: Number(limit),
      offset: Number(offset),
    };

    // Add optional filters
    if (startDate && typeof startDate === 'string') {
      options.startDate = startDate;
    }
    if (endDate && typeof endDate === 'string') {
      options.endDate = endDate;
    }
    if (tokenMint && typeof tokenMint === 'string') {
      options.tokenMint = tokenMint;
    }
    if (direction && typeof direction === 'string') {
      options.direction = direction;
    }

    // Get transfer history using Grid SDK
    const transfersResponse = await gridClient.getTransfers(gridAddress, options);

    if (!transfersResponse?.success) {
      Logger.error('Grid SDK transfer fetch failed:', transfersResponse?.error);
      return res.status(500).json({
        error: 'Failed to fetch transfer history from Grid SDK',
        details: transfersResponse?.error || 'Grid SDK transfer fetch failed'
      });
    }

    const transfersData = transfersResponse.data;
    Logger.info(`Fetched Grid transfer history for user ${email}:`, {
      success: transfersResponse.success,
      hasData: !!transfersData,
      transferCount: Array.isArray(transfersData) ? transfersData.length : 0,
      options: options
    });

    // Process the Grid SDK response
    const processedTransfers = Array.isArray(transfersData) ? transfersData.map((transfer: any) => ({
      id: transfer.id || transfer.signature,
      signature: transfer.signature,
      from: transfer.from,
      to: transfer.to,
      amount: transfer.amount,
      tokenMint: transfer.tokenMint,
      tokenSymbol: transfer.tokenSymbol || 'UNKNOWN',
      direction: transfer.direction,
      status: transfer.status,
      timestamp: transfer.timestamp,
      blockTime: transfer.blockTime,
      fee: transfer.fee,
      memo: transfer.memo,
      rawTransfer: transfer // Include raw data for debugging
    })) : [];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        walletAddress: user.walletAddress,
        gridAddress: user.gridAddress,
      },
      transfers: {
        data: processedTransfers,
        summary: {
          totalTransfers: processedTransfers.length,
          options: options,
          source: 'grid-sdk',
          gridAddress: gridAddress
        },
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          hasMore: processedTransfers.length === Number(limit)
        }
      },
      gridResponse: {
        success: transfersResponse.success,
        data: transfersData
      }
    });
  } catch (error) {
    Logger.error('Error fetching user transfer history from Grid SDK:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user transfer history from Grid SDK',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Debug endpoint to check raw Grid transfer API response for a specific user
export const debugUserTransfers = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    // Decode URL-encoded email address
    const decodedEmail = decodeURIComponent(email);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: decodedEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        authResult: true,
        sessionSecrets: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Use Grid address for transfer queries (Grid-to-Grid system)
    const gridAddress = user.gridAddress;
    
    if (!gridAddress) {
      return res.status(400).json({ 
        error: 'User does not have a Grid account',
        details: 'User must have a Grid account to fetch transfer history'
      });
    }

    Logger.info(`Debug: Fetching Grid transfer history for user ${email} (Grid address: ${gridAddress})`);

    // Get transfer history using Grid SDK
    const transfersResponse = await gridClient.getTransfers(gridAddress);

    if (!transfersResponse?.success) {
      Logger.error('Debug: Grid SDK transfer fetch failed:', transfersResponse?.error);
      return res.status(500).json({
        error: 'Failed to fetch transfer history from Grid SDK',
        details: transfersResponse?.error || 'Grid SDK transfer fetch failed'
      });
    }

    const transfersData = transfersResponse.data;
    Logger.info('Debug: Grid transfer history fetched:', {
      email,
      gridAddress,
      success: transfersResponse.success,
      hasData: !!transfersData,
      transferCount: Array.isArray(transfersData) ? transfersData.length : 0,
      transfers: Array.isArray(transfersData) ? transfersData.map((transfer: any) => ({
        id: transfer.id || transfer.signature,
        signature: transfer.signature,
        from: transfer.from,
        to: transfer.to,
        amount: transfer.amount,
        tokenMint: transfer.tokenMint,
        direction: transfer.direction,
        status: transfer.status,
        timestamp: transfer.timestamp
      })) : []
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
        authResult: user.authResult,
        sessionSecrets: user.sessionSecrets,
      },
      debug: {
        gridAddress,
        source: 'grid-sdk',
        gridResponse: {
          success: transfersResponse.success,
          data: transfersData
        },
        rawTransferData: transfersData
      }
    });
  } catch (error) {
    Logger.error('Debug: Error fetching user transfer history from Grid SDK:', error);
    res.status(500).json({ 
      error: 'Failed to debug user transfer history from Grid SDK',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Regular login process
export const login = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as UserLoginInput;

    // Decode URL-encoded email address
    const decodedEmail = decodeURIComponent(email);

    // Check if user exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { email: decodedEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        authResult: true,
        sessionSecrets: true,
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

    // Decode URL-encoded email address
    const decodedEmail = decodeURIComponent(email);

    // Check if user exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { email: decodedEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        authResult: true,
        sessionSecrets: true,
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

    Logger.info(`Grid authentication initiated for user ${email}`);

    res.status(201).json({
      message: 'Grid authentication initiated successfully',
      email: email,
      instructions: 'Check your email for the OTP code and use it with the complete login endpoint'
    });
  } catch (error) {
    Logger.error('Error initiating Grid login:', error);
    res.status(500).json({ error: 'Failed to initiate Grid login process' });
  }
};

export const completeLogin = async (req: Request, res: Response) => {
  try {
    const { email, otpCode } = req.body as CompleteLoginInput;

    if (!email || !otpCode) {
      return res.status(400).json({ 
        error: 'Email and OTP code are required' 
      });
    }

    // Decode URL-encoded email address
    const decodedEmail = decodeURIComponent(email);

    // Check if user exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { email: decodedEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        authResult: true,
        sessionSecrets: true,
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

    // Generate session secrets for the authenticated user
    const sessionSecrets = await gridClient.generateSessionSecrets();

    // Create a temporary user context for Grid SDK
    const tempUser = {
      email: existingUser.email,
      grid_user_id: existingUser.gridAddress || undefined,
      signers: [], // Empty signers array for existing account
    };

    // Complete Grid authentication using completeAuth
    const authResult = await gridClient.completeAuth({
      user: tempUser,
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

    // Update user with authentication data
    try {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          // Store Grid authentication data
          authResult: authResult.data as any || null,
          sessionSecrets: sessionSecrets as any || null,
        }
      });

      Logger.info(`Updated authentication data for user ${existingUser.email}`);
    } catch (dbError) {
      Logger.error('Failed to store authentication data in database:', dbError);
      // Continue with response even if database update fails
    }

    // Generate JWT token
    const token = generateToken(existingUser.id);

    Logger.info(`Login completed successfully for user ${existingUser.email}`);

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
      authData: {
        success: authResult.success,
        data: authResult.data,
      },
      sessionSecrets: sessionSecrets,
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

    // Decode URL-encoded email address
    const decodedEmail = decodeURIComponent(email);

    // Check if user exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { email: decodedEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        authResult: true,
        sessionSecrets: true,
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

    Logger.info(`Grid authentication initiated for user ${email}`);

    res.status(201).json({
      message: 'Grid authentication initiated successfully',
      email: email,
      instructions: 'Check your email for the OTP code and use it with the complete authentication endpoint'
    });
  } catch (error) {
    Logger.error('Error initializing Grid authentication:', error);
    res.status(500).json({ error: 'Failed to initialize Grid authentication' });
  }
};

// Complete Grid SDK authentication (simplified - no pending key)
export const completeGridAuth = async (req: Request, res: Response) => {
  try {
    const { email, otpCode } = req.body as CompleteLoginInput;

    if (!email || !otpCode) {
      return res.status(400).json({ 
        error: 'Email and OTP code are required' 
      });
    }

    // Decode URL-encoded email address
    const decodedEmail = decodeURIComponent(email);

    // Check if user exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { email: decodedEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        authResult: true,
        sessionSecrets: true,
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

    // Generate session secrets for the authenticated user
    const authSessionSecrets = await gridClient.generateSessionSecrets();

    // Create a temporary user context for Grid SDK
    const tempUser = {
      email: existingUser.email,
      grid_user_id: existingUser.gridAddress || undefined, // Use undefined instead of null
      signers: [], // Empty signers array for existing account
    };

    // Complete Grid authentication using completeAuth
    const authResult = await gridClient.completeAuth({
      user: tempUser,
      otpCode,
      sessionSecrets: authSessionSecrets,
    });

    if (!authResult?.success) {
      Logger.error('Grid authentication completion failed:', authResult);
      return res.status(401).json({
        error: 'Authentication failed',
        details: authResult?.error || 'Invalid verification code',
      });
    }

    // Generate session secrets for the authenticated user
    const sessionSecrets = await gridClient.generateSessionSecrets();

    // Update user with authentication data
    try {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          // Store Grid authentication data
          authResult: authResult.data as any || null,
          sessionSecrets: authSessionSecrets as any || null,
        }
      });

      Logger.info(`Updated authentication data for user ${existingUser.email}`);
    } catch (dbError) {
      Logger.error('Failed to store authentication data in database:', dbError);
      // Continue with response even if database update fails
    }

    // Generate JWT token
    const token = generateToken(existingUser.id);

    Logger.info(`Grid authentication completed successfully for user ${existingUser.email}`);

    return res.status(200).json({
      message: 'Grid authentication successful',
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
      authData: {
        success: authResult.success,
        data: authResult.data,
      },
      sessionSecrets: authSessionSecrets,
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
        authResult: true,
        sessionSecrets: true,
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

// Get complete Grid account data for a user
export const getUserGridData = async (req: Request, res: Response) => {
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
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        authResult: true,
        sessionSecrets: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.gridAddress) {
      return res.status(400).json({ 
        error: 'User does not have a Grid account',
        message: 'This user has not completed Grid account creation'
      });
    }

    Logger.info(`Retrieved complete Grid data for user ${email}`);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        walletAddress: user.walletAddress,
        gridAddress: user.gridAddress,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      gridAccount: {
        address: user.gridAddress,
        status: user.gridStatus,
        policies: (user as any).authResult?.policies,
      },
      completeGridData: {
        authResult: user.authResult,
        sessionSecrets: user.sessionSecrets,
      },
      summary: {
        hasGridAccount: !!user.gridAddress,
        hasAuthResult: !!user.authResult,
        hasSessionSecrets: !!user.sessionSecrets,
        hasCompleteData: !!(user.authResult && user.sessionSecrets),
        dataCompleteness: {
          authResult: user.authResult ? 'Complete' : 'Missing',
          sessionSecrets: user.sessionSecrets ? 'Complete' : 'Missing',
        }
      }
    });
  } catch (error) {
    Logger.error('Error fetching user Grid data:', error);
    res.status(500).json({ error: 'Failed to fetch user Grid data' });
  }
};

// TRANSACTION SYSTEM USING GRID SDK
// Prepare transaction for Grid SDK execution
export const prepareTransaction = async (req: Request, res: Response) => {
  try {
    const validatedData = req.body as PrepareTransactionInput;
    const { fromEmail, toEmail, amount, tokenMint, memo } = validatedData;

    // Find sender user
    const senderUser = await prisma.user.findUnique({
      where: { email: fromEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        authResult: true,
        sessionSecrets: true,
        isActive: true,
      },
    });

    if (!senderUser) {
      return res.status(404).json({ error: 'Sender user not found' });
    }

    if (!senderUser.isActive) {
      return res.status(401).json({ error: 'Sender account is inactive' });
    }

    // Find recipient user
    const recipientUser = await prisma.user.findUnique({
      where: { email: toEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        authResult: true,
        sessionSecrets: true,
        isActive: true,
      },
    });

    if (!recipientUser) {
      return res.status(404).json({ error: 'Recipient user not found' });
    }

    if (!recipientUser.isActive) {
      return res.status(401).json({ error: 'Recipient account is inactive' });
    }

    // Check if sender has Grid account data
    if (!senderUser.gridAddress || !(senderUser as any).authResult || !(senderUser as any).sessionSecrets) {
      return res.status(400).json({
        error: 'Sender does not have complete Grid account data',
        message: 'User must have completed Grid account creation with full data storage',
        debug: {
          hasGridAddress: !!senderUser.gridAddress,
          hasAuthResult: !!(senderUser as any).authResult,
          hasSessionSecrets: !!(senderUser as any).sessionSecrets,
          gridAddress: senderUser.gridAddress,
          authResultType: typeof (senderUser as any).authResult,
          sessionSecretsType: typeof (senderUser as any).sessionSecrets
        }
      });
    }

    // Construct gridData from simplified JSON fields
    const gridData = {
      authData: (senderUser as any).authResult,
      sessionData: (senderUser as any).sessionSecrets,
      accountData: {
        address: senderUser.gridAddress,
        status: senderUser.gridStatus,
      },
    };

    // Validate that we have the required data structure
    if (!gridData.sessionData) {
      Logger.error('Missing sessionSecrets in gridData:', {
        sessionData: gridData.sessionData,
        hasSessionSecrets: !!(gridData.sessionData),
        senderEmail: fromEmail,
        gridAddress: senderUser.gridAddress
      });
      return res.status(500).json({
        error: 'Missing session secrets',
        details: 'Session secrets not found in user data. Please re-authenticate.',
        debug: {
          sessionData: gridData.sessionData,
          hasSessionSecrets: !!(gridData.sessionData)
        }
      });
    }

    if (!gridData.authData?.authentication) {
      Logger.error('Missing authentication data in gridData:', {
        authData: gridData.authData,
        hasAuthentication: !!(gridData.authData?.authentication),
        senderEmail: fromEmail,
        gridAddress: senderUser.gridAddress
      });
      return res.status(500).json({
        error: 'Missing authentication data',
        details: 'Authentication data not found in user data. Please re-authenticate.',
        debug: {
          authData: gridData.authData,
          hasAuthentication: !!(gridData.authData?.authentication)
        }
      });
    }

    if (!gridData.accountData?.address) {
      Logger.error('Missing account address in gridData:', {
        accountData: gridData.accountData,
        hasAddress: !!(gridData.accountData?.address),
        senderEmail: fromEmail,
        gridAddress: senderUser.gridAddress
      });
      return res.status(500).json({
        error: 'Missing account address',
        details: 'Account address not found in user data. Please re-authenticate.',
        debug: {
          accountData: gridData.accountData,
          hasAddress: !!(gridData.accountData?.address)
        }
      });
    }

    // Use Grid addresses for transactions (Grid-to-Grid transfers)
    const fromAddress = senderUser.gridAddress;
    const toAddress = recipientUser.gridAddress;

    if (!fromAddress) {
      return res.status(400).json({ 
        error: 'Sender does not have a Grid address',
        details: 'Sender must have a Grid account to initiate transactions'
      });
    }

    if (!toAddress) {
      return res.status(400).json({ 
        error: 'Recipient does not have a Grid address',
        details: 'Recipient must have a Grid account to receive transactions'
      });
    }

    Logger.info(`Preparing Grid-to-Grid transaction: ${amount} ${tokenMint} from ${fromEmail} (${fromAddress}) to ${toEmail} (${toAddress})`);

    // Test blockchain connection
    const connectionTest = await blockchainService.testConnection();
    if (!connectionTest.success) {
      Logger.error('Blockchain connection failed:', connectionTest.error);
      return res.status(500).json({
        error: 'Blockchain service unavailable',
        details: connectionTest.error
      });
    }

    // Create raw transaction using blockchain service
    const transactionResult = await blockchainService.createTransaction(
      fromAddress,
      toAddress,
      tokenMint,
      parseFloat(amount),
      gridData.accountData.address // Pass Grid account address as payer
    );

    if (!transactionResult) {
      return res.status(500).json({
        error: 'Failed to create transaction',
        details: 'Transaction creation failed'
      });
    }

    // Validate the base64 transaction data using utility function
    const validation = validateBase64Transaction(transactionResult.transaction);
    if (!validation.isValid) {
      Logger.error('Invalid transaction data received from blockchain service:', {
        error: validation.error,
        transaction: transactionResult.transaction,
        type: typeof transactionResult.transaction
      });
      return res.status(500).json({
        error: 'Invalid transaction data',
        details: validation.error || 'Transaction data validation failed'
      });
    }

    Logger.info('Preparing transaction with Grid SDK:', {
      gridAddress: gridData.accountData.address,
      walletAddress: fromAddress,
      transactionLength: transactionResult.transaction.length,
      tokenMint,
      amount,
      transactionPreview: transactionResult.transaction.substring(0, 20) + '...',
      validation: validation,
      debugMode: true,
      requestPayload: {
        transaction: transactionResult.transaction.substring(0, 50) + '...',
        transaction_signers: [fromAddress],
        fee_config: {
          currency: "sol",
          payer_address: fromAddress
        }
      }
    });

    // Prepare transaction using Grid SDK
    let transactionPayloadResponse;
    try {
      transactionPayloadResponse = await gridClient.prepareArbitraryTransaction(
        gridData.accountData.address,
        {
          transaction: transactionResult.transaction,
          fee_config: {
            currency: "sol",
            payer_address: gridData.accountData.address
          }
        }
      );
    } catch (gridError) {
      Logger.error('Grid SDK prepareArbitraryTransaction error:', {
        error: gridError,
        errorString: JSON.stringify(gridError, null, 2),
        gridAddress: gridData.accountData.address,
        transactionLength: transactionResult.transaction.length,
        message: gridError instanceof Error ? gridError.message : 'Unknown error',
        stack: gridError instanceof Error ? gridError.stack : undefined,
        errorType: gridError?.constructor?.name || 'Unknown',
        errorCode: (gridError as any)?.code,
        errorStatus: (gridError as any)?.status,
        errorResponse: (gridError as any)?.response?.data
      });
      
      // Try to extract more detailed error information
      let detailedError = 'Grid SDK preparation error';
      let simulationLogs = null;
      
      if (gridError instanceof Error) {
        detailedError = gridError.message;
      }
      
      // Check if the error has response data with simulation logs
      if ((gridError as any)?.response?.data?.simulation_logs) {
        simulationLogs = (gridError as any).response.data.simulation_logs;
        Logger.error('Simulation logs found in error response:', {
          simulationLogs: simulationLogs,
          logCount: simulationLogs.length
        });
      }
      
      // Check if the error has data property with simulation logs
      if ((gridError as any)?.data?.simulation_logs) {
        simulationLogs = (gridError as any).data.simulation_logs;
        Logger.error('Simulation logs found in error data:', {
          simulationLogs: simulationLogs,
          logCount: simulationLogs.length
        });
      }
      
      return res.status(500).json({
        error: 'Transaction preparation failed',
        details: detailedError,
        fullError: gridError,
        simulationLogs: simulationLogs,
        errorType: gridError?.constructor?.name || 'Unknown',
        errorCode: (gridError as any)?.code,
        errorStatus: (gridError as any)?.status
      });
    }

    // Check for simulation logs in the successful response (top level)
    if ((transactionPayloadResponse as any)?.data?.simulation_logs) {
      Logger.info('Grid SDK Simulation Logs (from successful response):', {
        simulationLogs: (transactionPayloadResponse as any).data.simulation_logs,
        logCount: (transactionPayloadResponse as any).data.simulation_logs.length,
        logs: (transactionPayloadResponse as any).data.simulation_logs
      });
      
      // Log each simulation log individually
      (transactionPayloadResponse as any).data.simulation_logs.forEach((log: string, index: number) => {
        Logger.info(`Success Simulation Log ${index + 1}: ${log}`);
      });
    }

    if (!transactionPayloadResponse?.success) {
        Logger.error('Grid transaction preparation failed:', {
        response: transactionPayloadResponse,
        responseError: transactionPayloadResponse?.error,
        gridAddress: gridData.accountData.address,
        transactionLength: transactionResult.transaction.length,
        fullResponse: JSON.stringify(transactionPayloadResponse, null, 2)
      });
      
      // Check for simulation logs in the error response
      if ((transactionPayloadResponse as any)?.data?.simulation_logs) {
        Logger.error('Grid SDK Simulation Logs (from error response):', {
          simulationLogs: (transactionPayloadResponse as any).data.simulation_logs,
          logCount: (transactionPayloadResponse as any).data.simulation_logs.length,
          logs: (transactionPayloadResponse as any).data.simulation_logs
        });
      }
      
      return res.status(500).json({
        error: 'Transaction preparation failed',
          details: transactionPayloadResponse?.error || 'Grid transaction preparation failed',
        fullResponse: transactionPayloadResponse,
        simulationLogs: (transactionPayloadResponse as any)?.data?.simulation_logs || null
      });
    }

    const transactionPayload = transactionPayloadResponse.data;

    if (!transactionPayload) {
      Logger.error('No transaction payload received from Grid SDK');
      return res.status(500).json({
        error: 'Transaction preparation failed',
        details: 'No transaction payload received'
      });
    }

    // Log debug information if available
    if ((transactionPayload as any).simulation_logs) {
      Logger.info('Grid SDK Debug - Simulation Logs:', {
        logs: (transactionPayload as any).simulation_logs,
        logCount: (transactionPayload as any).simulation_logs.length,
        detailedLogs: (transactionPayload as any).simulation_logs.map((log: string, index: number) => ({
          index: index + 1,
          log: log
        }))
      });
      
      // Also log each simulation log individually for better readability
      (transactionPayload as any).simulation_logs.forEach((log: string, index: number) => {
        Logger.info(`Simulation Log ${index + 1}: ${log}`);
      });
    } else {
      Logger.info('No simulation logs available in response');
    }

    // Determine token symbol
    let tokenSymbol = 'UNKNOWN';
    if (tokenMint === TOKEN_MINTS.SOL) tokenSymbol = 'SOL';
    else if (tokenMint === TOKEN_MINTS.USDC_DEVNET) tokenSymbol = 'USDC';

    Logger.info(`Transaction prepared successfully: ${amount} ${tokenSymbol} from ${fromAddress} to ${toAddress}`, {
      kmsPayloadsCount: transactionPayload.kms_payloads?.length || 0,
      transactionSigners: transactionPayload.transaction_signers,
      hasSimulationLogs: !!(transactionPayload as any).simulation_logs
    });

    res.status(200).json({
      message: 'Transaction prepared successfully',
      transaction: {
        id: `tx_${Date.now()}`,
        from: {
          email: senderUser.email,
          name: `${senderUser.firstName} ${senderUser.lastName}`,
          address: fromAddress,
          gridAddress: senderUser.gridAddress,
        },
        to: {
          email: recipientUser.email,
          name: `${recipientUser.firstName} ${recipientUser.lastName}`,
          address: toAddress,
          gridAddress: recipientUser.gridAddress,
        },
        amount,
        tokenMint,
        tokenSymbol,
        memo: memo || null,
        status: 'prepared',
        timestamp: new Date().toISOString(),
      },
      transactionPayload: {
        transaction: transactionPayload.transaction,
        transaction_signers: transactionPayload.transaction_signers,
        kms_payloads: transactionPayload.kms_payloads,
      },
      gridData: {
        address: gridData.accountData.address, // authResult.address,
        hasSessionSecrets: !!(gridData.sessionData),
        hasAccountData: !!gridData.accountData,
        hasAuthData: !!gridData.authData,
      },
      blockchainInfo: {
        network: 'devnet',
        rpcUrl: 'https://api.devnet.solana.com',
        fee: '5000', // Estimated fee
      },
      simulationLogs: (transactionPayload as any).simulation_logs || null,
    });
  } catch (error) {
    Logger.error('Error preparing transaction:', error);
    res.status(500).json({ error: 'Failed to prepare transaction' });
  }
};

// Execute transaction using Grid SDK
export const executeTransaction = async (req: Request, res: Response) => {
  try {
    const validatedData = req.body as ExecuteTransactionInput;
    const { fromEmail, transactionPayload, memo } = validatedData;

    // Find sender user
    const senderUser = await prisma.user.findUnique({
      where: { email: fromEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        authResult: true,
        sessionSecrets: true,
        isActive: true,
      },
    });

    if (!senderUser) {
      return res.status(404).json({ error: 'Sender user not found' });
    }

    if (!senderUser.isActive) {
      return res.status(401).json({ error: 'Sender account is inactive' });
    }

    // Check if sender has Grid account data
    if (!senderUser.gridAddress || !(senderUser as any).gridAccountData || !(senderUser as any).gridSessionData) {
      return res.status(400).json({
        error: 'Sender does not have complete Grid account data',
        message: 'User must have completed Grid account creation with full data storage'
      });
    }

    const gridData = {
      authData: (senderUser as any).gridAuthData,
      accountData: (senderUser as any).gridAccountData,
      sessionData: (senderUser as any).gridSessionData,
      metadata: (senderUser as any).gridMetadata,
    };

    // Log the EXACT data being sent to Grid SDK signAndSend method
    console.log('\n' + '='.repeat(80));
    console.log('🚀 GRID SDK SIGN AND SEND - EXACT DATA BEING SENT');
    console.log('='.repeat(80));
    
    const exactSignAndSendData = {
      sessionSecrets: gridData.sessionData,
        session: gridData.authData?.authentication, // Auth token from authentication step
      transactionPayload: {
        ...transactionPayload,
        kms_payloads: transactionPayload.kms_payloads || []
      }, // Transaction data with ensured kms_payloads array
      address: gridData.accountData.address
    };
    
    console.log('\n📋 METHOD: gridClient.signAndSend()');
    console.log('📊 PARAMETERS:');
    console.log(JSON.stringify(exactSignAndSendData, null, 2));
    
    console.log('\n🔍 DETAILED BREAKDOWN:');
    console.log('├── sessionSecrets:');
    console.log(`│   └── ${JSON.stringify(gridData.sessionData, null, 4)}`);
    console.log('├── session (auth token):');
    console.log(`│   └── ${JSON.stringify(gridData.authData?.authentication, null, 4)}`);
    console.log('├── transactionPayload:');
    console.log(`│   ├── transaction: "${transactionPayload.transaction?.substring(0, 50)}..."`);
    console.log(`│   ├── transaction_signers: ${JSON.stringify(transactionPayload.transaction_signers)}`);
    console.log(`│   ├── kms_payloads: ${JSON.stringify(transactionPayload.kms_payloads || [])}`);
    console.log(`│   └── fee_config: ${JSON.stringify((transactionPayload as any).fee_config)}`);
    console.log(`└── address: "${gridData.accountData.address}"`);
    
    console.log('\n📏 DATA SIZES:');
    console.log(`├── sessionSecrets size: ${JSON.stringify(gridData.sessionData).length} chars`);
    console.log(`├── transaction base64 length: ${transactionPayload.transaction?.length || 0} chars`);
    console.log(`├── transaction_signers count: ${transactionPayload.transaction_signers?.length || 0}`);
    console.log(`├── kms_payloads count: ${(transactionPayload.kms_payloads || []).length}`);
    console.log(`└── session (auth token) size: ${gridData.authData?.authentication ? JSON.stringify(gridData.authData.authentication).length : 0} chars`);
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 CALLING: await gridClient.signAndSend(exactSignAndSendData)');
    console.log('='.repeat(80) + '\n');

    // Debug: Check what's actually in gridData
    console.log('\n🔍 GRID DATA DEBUG:');
    console.log(`├── authData: ${JSON.stringify(gridData.authData, null, 2)}`);
    console.log(`├── accountData: ${JSON.stringify(gridData.accountData, null, 2)}`);
    console.log(`├── sessionData: ${JSON.stringify(gridData.sessionData, null, 2)}`);
    
    // Check if we have authentication data (following guide pattern)
    if (!gridData.sessionData) {
      Logger.error('Missing sessionSecrets in gridData:', {
        sessionData: gridData.sessionData,
        hasSessionSecrets: !!(gridData.sessionData?.sessionSecrets)
      });
      return res.status(500).json({
        error: 'Missing session secrets',
        details: 'Session secrets not found. Please re-authenticate.',
        sessionExpired: true
      });
    }

    if (!gridData.authData?.authentication) {
      Logger.error('Missing authentication data in gridData:', {
        authData: gridData.authData,
        accountData: gridData.accountData,
        sessionData: gridData.sessionData
      });
      return res.status(500).json({
        error: 'Missing authentication data',
        details: 'Authentication data not found. Please re-authenticate.',
        sessionExpired: true,
        guidance: {
          message: 'Authentication data is missing. Please refresh your session.',
          action: 'Call /api/users/refresh-session to refresh your session',
          endpoints: {
            refreshSession: '/api/users/refresh-session',
            completeRefresh: '/api/users/complete-session-refresh',
            checkStatus: `/api/users/session-status/${encodeURIComponent(fromEmail)}`
          }
        }
      });
    }

    // Execute transaction using Grid SDK signAndSend (following guide pattern)
    let executedTxResponse;
    try {
      executedTxResponse = await gridClient.signAndSend({
        sessionSecrets: gridData.sessionData, // From account creation step
        session: gridData.authData.authentication, // Auth token from previous step (authResult.authentication)
        transactionPayload: {
          ...transactionPayload,
          kms_payloads: transactionPayload.kms_payloads || []
        },
        address: gridData.accountData.address, // authResult.address
      });
    } catch (signingError: any) {
      // Check for Privy session expiry errors
      const errorMessage = signingError?.message || '';
      const errorResponse = signingError?.response?.data || signingError?.data || {};
      
      if (errorMessage.includes('Privy signing error') || 
          errorMessage.includes('session has expired') ||
          errorMessage.includes('KeyQuorum user session key is expired') ||
          errorResponse?.error?.includes('session') && errorResponse?.error?.includes('expired')) {
        
        Logger.error('Privy session expired during transaction execution:', {
          error: signingError,
          userEmail: fromEmail,
          gridAddress: gridData.accountData.address,
          errorMessage,
          errorResponse
        });
        
        return res.status(401).json({
          error: 'Session expired',
          details: 'Your Privy session has expired. Please refresh your session to continue.',
          sessionExpired: true,
          guidance: {
            message: 'Your authentication session has expired after 24 hours.',
            action: 'Call /api/users/refresh-session to refresh your session',
            endpoints: {
              refreshSession: '/api/users/refresh-session',
              completeRefresh: '/api/users/complete-session-refresh',
              checkStatus: `/api/users/session-status/${encodeURIComponent(fromEmail)}`
            }
          }
        });
      }
      
      // Re-throw other errors
      throw signingError;
    }

    // Handle Grid SDK response - it might not have success/error properties
    if (!executedTxResponse) {
      Logger.error('Grid transaction execution failed: No response received');
      return res.status(500).json({
        error: 'Transaction execution failed',
        details: 'No response received from Grid SDK'
      });
    }

    // Check if response has success property (GridResponse format)
    if ((executedTxResponse as any).success === false) {
      Logger.error('Grid transaction execution failed:', executedTxResponse);
      return res.status(500).json({
        error: 'Transaction execution failed',
        details: (executedTxResponse as any).error || 'Grid transaction execution failed'
      });
    }

    // Extract data from response
    const executedTx = (executedTxResponse as any).data || executedTxResponse;

    Logger.info(`Transaction executed successfully for user ${fromEmail}: ${executedTx?.signature}`);

    res.status(200).json({
      message: 'Transaction executed successfully',
      transaction: {
        id: `tx_${Date.now()}`,
        signature: executedTx?.signature || 'pending',
        from: {
          email: senderUser.email,
          name: `${senderUser.firstName} ${senderUser.lastName}`,
          address: senderUser.gridAddress, // Use Grid address as primary
          walletAddress: senderUser.walletAddress, // Keep wallet address for reference
          gridAddress: senderUser.gridAddress,
        },
        memo: memo || null,
        status: 'executed',
        timestamp: new Date().toISOString(),
      },
      executionResult: {
        success: true,
        signature: executedTx?.signature,
        data: executedTx,
      },
      gridData: {
        address: gridData.accountData.address, // authResult.address,
        sessionUsed: !!gridData.sessionData?.sessionSecrets,
        accountUsed: !!gridData.accountData,
      },
    });
  } catch (error) {
    Logger.error('Error executing transaction:', error);
    res.status(500).json({ error: 'Failed to execute transaction' });
  }
};

// Send transaction (combines prepare and execute)
export const sendTransaction = async (req: Request, res: Response) => {
  try {
    const validatedData = req.body as SendTransactionInput;
    const { fromEmail, toEmail, amount, tokenMint, memo } = validatedData;

    // Find sender user
    const senderUser = await prisma.user.findUnique({
      where: { email: fromEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        authResult: true,
        sessionSecrets: true,
        isActive: true,
      },
    });

    if (!senderUser) {
      return res.status(404).json({ error: 'Sender user not found' });
    }

    if (!senderUser.isActive) {
      return res.status(401).json({ error: 'Sender account is inactive' });
    }

    // Find recipient user
    const recipientUser = await prisma.user.findUnique({
      where: { email: toEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        authResult: true,
        sessionSecrets: true,
        isActive: true,
      },
    });

    if (!recipientUser) {
      return res.status(404).json({ error: 'Recipient user not found' });
    }

    if (!recipientUser.isActive) {
      return res.status(401).json({ error: 'Recipient account is inactive' });
    }

    // Check if sender has Grid account data
    if (!senderUser.gridAddress || !(senderUser as any).authResult || !(senderUser as any).sessionSecrets) {
      return res.status(400).json({
        error: 'Sender does not have complete Grid account data',
        message: 'User must have completed Grid account creation with full data storage',
        debug: {
          hasGridAddress: !!senderUser.gridAddress,
          hasAuthResult: !!(senderUser as any).authResult,
          hasSessionSecrets: !!(senderUser as any).sessionSecrets,
          gridAddress: senderUser.gridAddress,
          authResultType: typeof (senderUser as any).authResult,
          sessionSecretsType: typeof (senderUser as any).sessionSecrets
        }
      });
    }

    // Construct gridData from simplified JSON fields
    const gridData = {
      authData: (senderUser as any).authResult,
      sessionData: (senderUser as any).sessionSecrets,
      accountData: {
        address: senderUser.gridAddress,
        status: senderUser.gridStatus,
      },
    };

    // Validate that we have the required data structure
    if (!gridData.sessionData) {
      Logger.error('Missing sessionSecrets in gridData:', {
        sessionData: gridData.sessionData,
        hasSessionSecrets: !!(gridData.sessionData),
        senderEmail: fromEmail,
        gridAddress: senderUser.gridAddress
      });
      return res.status(500).json({
        error: 'Missing session secrets',
        details: 'Session secrets not found in user data. Please re-authenticate.',
        debug: {
          sessionData: gridData.sessionData,
          hasSessionSecrets: !!(gridData.sessionData)
        }
      });
    }

    if (!gridData.authData?.authentication) {
      Logger.error('Missing authentication data in gridData:', {
        authData: gridData.authData,
        hasAuthentication: !!(gridData.authData?.authentication),
        senderEmail: fromEmail,
        gridAddress: senderUser.gridAddress
      });
      return res.status(500).json({
        error: 'Missing authentication data',
        details: 'Authentication data not found in user data. Please re-authenticate.',
        debug: {
          authData: gridData.authData,
          hasAuthentication: !!(gridData.authData?.authentication)
        }
      });
    }

    if (!gridData.accountData?.address) {
      Logger.error('Missing account address in gridData:', {
        accountData: gridData.accountData,
        hasAddress: !!(gridData.accountData?.address),
        senderEmail: fromEmail,
        gridAddress: senderUser.gridAddress
      });
      return res.status(500).json({
        error: 'Missing account address',
        details: 'Account address not found in user data. Please re-authenticate.',
        debug: {
          accountData: gridData.accountData,
          hasAddress: !!(gridData.accountData?.address)
        }
      });
    }

    // Use Grid addresses for transactions (Grid-to-Grid transfers)
    const fromAddress = senderUser.gridAddress;
    const toAddress = recipientUser.gridAddress;

    if (!fromAddress) {
      return res.status(400).json({ 
        error: 'Sender does not have a Grid address',
        details: 'Sender must have a Grid account to initiate transactions'
      });
    }

    if (!toAddress) {
      return res.status(400).json({ 
        error: 'Recipient does not have a Grid address',
        details: 'Recipient must have a Grid account to receive transactions'
      });
    }

    Logger.info(`Sending Grid-to-Grid transaction: ${amount} ${tokenMint} from ${fromEmail} (${fromAddress}) to ${toEmail} (${toAddress})`);

    // Test blockchain connection
    const connectionTest = await blockchainService.testConnection();
    if (!connectionTest.success) {
      Logger.error('Blockchain connection failed:', connectionTest.error);
      return res.status(500).json({
        error: 'Blockchain service unavailable',
        details: connectionTest.error
      });
    }

    // Create raw transaction using blockchain service
    const transactionResult = await blockchainService.createTransaction(
      fromAddress,
      toAddress,
      tokenMint,
      parseFloat(amount),
      gridData.accountData.address // Pass Grid account address as payer
    );

    if (!transactionResult) {
      return res.status(500).json({
        error: 'Failed to create transaction',
        details: 'Transaction creation failed'
      });
    }

    // Log the EXACT data being sent to Grid SDK prepareArbitraryTransaction method
    console.log('\n' + '='.repeat(80));
    console.log('🔧 GRID SDK PREPARE ARBITRARY TRANSACTION - EXACT DATA BEING SENT');
    console.log('='.repeat(80));
    
    const exactPrepareData = {
      gridAddress: gridData.accountData.address,
      transactionPayload: {
        transaction: transactionResult.transaction,
        transaction_signers: [fromAddress],
        fee_config: {
          currency: "sol",
          payer_address: fromAddress
        }
      },
      options: { debug: true }
    };
    
    console.log('\n📋 METHOD: gridClient.prepareArbitraryTransaction()');
    console.log('📊 PARAMETERS:');
    console.log(JSON.stringify(exactPrepareData, null, 2));
    
    console.log('\n🔍 DETAILED BREAKDOWN:');
    console.log(`├── gridAddress: "${gridData.accountData.address}"`);
    console.log('├── transactionPayload:');
    console.log(`│   ├── transaction: "${transactionResult.transaction.substring(0, 50)}..."`);
    console.log(`│   ├── transaction_signers: ${JSON.stringify([fromAddress])}`);
    console.log(`│   └── fee_config: ${JSON.stringify({ currency: "sol", payer_address: gridData.accountData.address })}`);
    console.log('└── options:');
    console.log(`    └── debug: true`);
    
    console.log('\n📏 DATA SIZES:');
    console.log(`├── gridAddress length: ${gridData.accountData.address.length} chars`);
    console.log(`├── transaction base64 length: ${transactionResult.transaction.length} chars`);
    console.log(`├── transaction_signers count: 1`);
    console.log(`└── fee_config size: ${JSON.stringify({ currency: "sol", payer_address: gridData.accountData.address }).length} chars`);
    
    console.log('\n📄 FULL BASE64 TRANSACTION:');
    console.log('└── ' + transactionResult.transaction);
    
    console.log('\n🏦 TRANSACTION STRUCTURE:');
    console.log(`├── Grid Account: ${gridData.accountData.address}`);
    console.log(`├── Primary Signer: ${fromAddress} (controls Grid account)`);
    console.log(`├── Transaction Source: Grid account`);
    console.log(`├── Fee Payer: Grid account`);
    console.log(`├── Transfer Type: Grid account → Recipient wallet`);
    console.log(`└── Primary signer authorizes Grid account to execute`);
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 CALLING: await gridClient.prepareArbitraryTransaction(gridAddress, transactionPayload, options)');
    console.log('='.repeat(80) + '\n');

    Logger.info('Preparing transaction with Grid SDK:', {
      gridAddress: gridData.accountData.address,
      walletAddress: fromAddress,
      transactionLength: transactionResult.transaction.length,
      tokenMint,
      amount,
      fullBase64Transaction: transactionResult.transaction
    });

    // Prepare transaction using Grid SDK
    const transactionPayloadResponse = await gridClient.prepareArbitraryTransaction(
      gridData.accountData.address,
      {
        transaction: transactionResult.transaction,
        fee_config: {
          currency: "sol",
          payer_address: gridData.accountData.address
        }
      }
    );

    if (!transactionPayloadResponse?.success) {
        Logger.error('Grid transaction preparation failed:', {
        response: transactionPayloadResponse,
        responseError: transactionPayloadResponse?.error,
        gridAddress: gridData.accountData.address,
        transactionLength: transactionResult.transaction.length,
        fullResponse: JSON.stringify(transactionPayloadResponse, null, 2)
      });
      
      // Check for simulation logs in the error response
      if ((transactionPayloadResponse as any)?.data?.simulation_logs) {
        Logger.error('Grid SDK Simulation Logs (from error response):', {
          simulationLogs: (transactionPayloadResponse as any).data.simulation_logs,
          logCount: (transactionPayloadResponse as any).data.simulation_logs.length,
          logs: (transactionPayloadResponse as any).data.simulation_logs
        });
        
        // Log each simulation log individually
        (transactionPayloadResponse as any).data.simulation_logs.forEach((log: string, index: number) => {
          Logger.error(`Error Simulation Log ${index + 1}: ${log}`);
        });
      }
      
      return res.status(500).json({
        error: 'Transaction preparation failed',
          details: transactionPayloadResponse?.error || 'Grid transaction preparation failed',
        fullResponse: transactionPayloadResponse,
        simulationLogs: (transactionPayloadResponse as any)?.data?.simulation_logs || null
      });
    }

    const transactionPayload = transactionPayloadResponse.data;

    if (!transactionPayload) {
      Logger.error('No transaction payload received from Grid SDK');
      return res.status(500).json({
        error: 'Transaction preparation failed',
        details: 'No transaction payload received'
      });
    }

    // Log the EXACT data being sent to Grid SDK signAndSend method (SEND TRANSACTION)
    console.log('\n' + '='.repeat(80));
    console.log('🚀 GRID SDK SIGN AND SEND (SEND TRANSACTION) - EXACT DATA BEING SENT');
    console.log('='.repeat(80));
    
    const exactSignAndSendData = {
      sessionSecrets: gridData.sessionData,
        session: gridData.authData?.authentication, // Auth token from authentication step
      transactionPayload: {
        ...transactionPayload,
        kms_payloads: transactionPayload.kms_payloads || []
      }, // Transaction data with ensured kms_payloads array
      address: gridData.accountData.address
    };
    
    console.log('\n📋 METHOD: gridClient.signAndSend() [SEND TRANSACTION]');
    console.log('📊 PARAMETERS:');
    console.log(JSON.stringify(exactSignAndSendData, null, 2));
    
    console.log('\n🔍 DETAILED BREAKDOWN:');
    console.log('├── sessionSecrets:');
    console.log(`│   └── ${JSON.stringify(gridData.sessionData, null, 4)}`);
    console.log('├── session (auth token):');
    console.log(`│   └── ${JSON.stringify(gridData.authData?.authentication, null, 4)}`);
    console.log('├── transactionPayload:');
    console.log(`│   ├── transaction: "${transactionPayload.transaction?.substring(0, 50)}..."`);
    console.log(`│   ├── transaction_signers: ${JSON.stringify(transactionPayload.transaction_signers)}`);
    console.log(`│   ├── kms_payloads: ${JSON.stringify(transactionPayload.kms_payloads || [])}`);
    console.log(`│   └── fee_config: ${JSON.stringify((transactionPayload as any).fee_config)}`);
    console.log(`└── address: "${gridData.accountData.address}"`);
    
    console.log('\n📏 DATA SIZES:');
    console.log(`├── sessionSecrets size: ${JSON.stringify(gridData.sessionData).length} chars`);
    console.log(`├── transaction base64 length: ${transactionPayload.transaction?.length || 0} chars`);
    console.log(`├── transaction_signers count: ${transactionPayload.transaction_signers?.length || 0}`);
    console.log(`├── kms_payloads count: ${(transactionPayload.kms_payloads || []).length}`);
    console.log(`└── session (auth token) size: ${gridData.authData?.authentication ? JSON.stringify(gridData.authData.authentication).length : 0} chars`);
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 CALLING: await gridClient.signAndSend(exactSignAndSendData) [SEND TRANSACTION]');
    console.log('='.repeat(80) + '\n');

    // Debug: Check what's actually in gridData
    console.log('\n🔍 GRID DATA DEBUG [SEND TRANSACTION]:');
    console.log(`├── authData: ${JSON.stringify(gridData.authData, null, 2)}`);
    console.log(`├── accountData: ${JSON.stringify(gridData.accountData, null, 2)}`);
    console.log(`├── sessionData: ${JSON.stringify(gridData.sessionData, null, 2)}`);
    
    // Check if we have authentication data
    if (!gridData.authData?.authentication) {
      Logger.error('Missing authentication data in gridData [SEND TRANSACTION]:', {
        authData: gridData.authData,
        accountData: gridData.accountData,
        sessionData: gridData.sessionData
      });
      return res.status(500).json({
        error: 'Missing authentication data',
        details: 'Authentication data not found. Please re-authenticate.',
        sessionExpired: true,
        guidance: {
          message: 'Authentication data is missing. Please refresh your session.',
          action: 'Call /api/users/refresh-session to refresh your session',
          endpoints: {
            refreshSession: '/api/users/refresh-session',
            completeRefresh: '/api/users/complete-session-refresh',
            checkStatus: `/api/users/session-status/${encodeURIComponent(fromEmail)}`
          }
        }
      });
    }

    // Execute transaction using Grid SDK signAndSend (following guide pattern)
    let executedTxResponse;
    try {
      executedTxResponse = await gridClient.signAndSend({
        sessionSecrets: gridData.sessionData, // From account creation step
        session: gridData.authData.authentication, // Auth token from previous step (authResult.authentication)
        transactionPayload: {
          ...transactionPayload,
          kms_payloads: transactionPayload.kms_payloads || []
        },
        address: gridData.accountData.address, // authResult.address
      });
    } catch (signingError: any) {
      // Check for Privy session expiry errors
      const errorMessage = signingError?.message || '';
      const errorResponse = signingError?.response?.data || signingError?.data || {};
      
      if (errorMessage.includes('Privy signing error') || 
          errorMessage.includes('session has expired') ||
          errorMessage.includes('KeyQuorum user session key is expired') ||
          errorResponse?.error?.includes('session') && errorResponse?.error?.includes('expired')) {
        
        Logger.error('Privy session expired during transaction execution:', {
          error: signingError,
          userEmail: fromEmail,
          gridAddress: gridData.accountData.address,
          errorMessage,
          errorResponse
        });
        
        return res.status(401).json({
          error: 'Session expired',
          details: 'Your Privy session has expired. Please refresh your session to continue.',
          sessionExpired: true,
          guidance: {
            message: 'Your authentication session has expired after 24 hours.',
            action: 'Call /api/users/refresh-session to refresh your session',
            endpoints: {
              refreshSession: '/api/users/refresh-session',
              completeRefresh: '/api/users/complete-session-refresh',
              checkStatus: `/api/users/session-status/${encodeURIComponent(fromEmail)}`
            }
          }
        });
      }
      
      // Re-throw other errors
      throw signingError;
    }

    // Handle Grid SDK response - it might not have success/error properties
    if (!executedTxResponse) {
      Logger.error('Grid transaction execution failed: No response received');
      return res.status(500).json({
        error: 'Transaction execution failed',
        details: 'No response received from Grid SDK'
      });
    }

    // Check if response has success property (GridResponse format)
    if ((executedTxResponse as any).success === false) {
      Logger.error('Grid transaction execution failed:', executedTxResponse);
      return res.status(500).json({
        error: 'Transaction execution failed',
        details: (executedTxResponse as any).error || 'Grid transaction execution failed'
      });
    }

    // Extract data from response
    const executedTx = (executedTxResponse as any).data || executedTxResponse;

    // Determine token symbol
    let tokenSymbol = 'UNKNOWN';
    if (tokenMint === TOKEN_MINTS.SOL) tokenSymbol = 'SOL';
    else if (tokenMint === TOKEN_MINTS.USDC_DEVNET) tokenSymbol = 'USDC';

    Logger.info(`Transaction sent successfully: ${amount} ${tokenSymbol} from ${fromAddress} to ${toAddress}, signature: ${executedTx?.signature}`);

    res.status(200).json({
      message: 'Transaction sent successfully',
      transaction: {
        id: `tx_${Date.now()}`,
        signature: executedTx?.signature || 'pending',
        from: {
          email: senderUser.email,
          name: `${senderUser.firstName} ${senderUser.lastName}`,
          address: fromAddress, // Grid address
          walletAddress: senderUser.walletAddress, // Keep wallet address for reference
          gridAddress: senderUser.gridAddress,
        },
        to: {
          email: recipientUser.email,
          name: `${recipientUser.firstName} ${recipientUser.lastName}`,
          address: toAddress, // Grid address
          walletAddress: recipientUser.walletAddress, // Keep wallet address for reference
          gridAddress: recipientUser.gridAddress,
        },
        amount,
        tokenMint,
        tokenSymbol,
        memo: memo || null,
        status: 'sent',
        timestamp: new Date().toISOString(),
      },
      executionResult: {
        success: true,
        signature: executedTx?.signature,
        data: executedTx,
      },
      blockchainInfo: {
        network: 'devnet',
        rpcUrl: 'https://api.devnet.solana.com',
        signature: executedTx?.signature,
        explorerUrl: `https://explorer.solana.com/tx/${executedTx?.signature}?cluster=devnet`,
      },
    });
  } catch (error) {
    Logger.error('Error sending transaction:', error);
    res.status(500).json({ error: 'Failed to send transaction' });
  }
};

// Send SOL transaction
export const sendSolTransaction = async (req: Request, res: Response) => {
  try {
    const validatedData = req.body as SendSolTransactionInput;
    const { fromEmail, toEmail, amount, memo } = validatedData;

    // Create SOL transaction using the general sendTransaction function
    const solTransactionInput: SendTransactionInput = {
      fromEmail,
      toEmail,
      amount,
      tokenMint: TOKEN_MINTS.SOL,
      memo,
    };

    // Update the request body and call the general transaction function
    req.body = solTransactionInput;
    return await sendTransaction(req, res);
  } catch (error) {
    Logger.error('Error sending SOL transaction:', error);
    res.status(500).json({ error: 'Failed to send SOL transaction' });
  }
};

// Send USDC transaction
export const sendUsdcTransaction = async (req: Request, res: Response) => {
  try {
    const validatedData = req.body as SendUsdcTransactionInput;
    const { fromEmail, toEmail, amount, memo } = validatedData;

    // Create USDC transaction using the general sendTransaction function
    const usdcTransactionInput: SendTransactionInput = {
      fromEmail,
      toEmail,
      amount,
      tokenMint: TOKEN_MINTS.USDC_DEVNET,
      memo,
    };

    // Update the request body and call the general transaction function
    req.body = usdcTransactionInput;
    return await sendTransaction(req, res);
  } catch (error) {
    Logger.error('Error sending USDC transaction:', error);
    res.status(500).json({ error: 'Failed to send USDC transaction' });
  }
};

// Debug transaction data endpoint (shows exactly what's being sent to Grid SDK)
export const debugTransactionData = async (req: Request, res: Response) => {
  try {
    const { fromAddress, toAddress, tokenMint, amount } = req.body;

    if (!fromAddress || !toAddress || !tokenMint || !amount) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['fromAddress', 'toAddress', 'tokenMint', 'amount']
      });
    }

    Logger.info('Debug: Creating transaction data for Grid SDK:', { fromAddress, toAddress, tokenMint, amount });

    // Test blockchain connection
    const connectionTest = await blockchainService.testConnection();
    if (!connectionTest.success) {
      return res.status(500).json({
        error: 'Blockchain service unavailable',
        details: connectionTest.error
      });
    }

    // Create raw transaction
    const transactionResult = await blockchainService.createTransaction(
      fromAddress,
      toAddress,
      tokenMint,
      parseFloat(amount)
    );

    if (!transactionResult) {
      return res.status(500).json({
        error: 'Failed to create transaction',
        details: 'Transaction creation failed'
      });
    }

    // Validate base64 format using utility function
    const validation = validateBase64Transaction(transactionResult.transaction);

    res.json({
      message: 'Transaction data debug information',
      debug: {
        input: {
          fromAddress,
          toAddress,
          tokenMint,
          amount: parseFloat(amount)
        },
        blockchainService: {
          connectionTest: connectionTest,
          transactionCreated: !!transactionResult,
          transactionLength: transactionResult.transaction.length
        },
        transactionData: {
          base64: transactionResult.transaction,
          length: transactionResult.transaction.length,
          preview: transactionResult.transaction.substring(0, 50) + '...',
          lastChars: '...' + transactionResult.transaction.substring(transactionResult.transaction.length - 20)
        },
        validation: {
          isValid: validation.isValid,
          error: validation.error
        },
        gridSDKPayload: {
          transaction: transactionResult.transaction,
          transaction_signers: [fromAddress], // Primary signer (wallet address)
          fee_config: {
            currency: "sol",
            payer_address: "GRID_ACCOUNT_ADDRESS" // Grid account pays fees
          },
          debug: true,
          transactionPreview: transactionResult.transaction.substring(0, 50) + '...'
        },
        analysis: {
          isSOLTransfer: tokenMint === TOKEN_MINTS.SOL,
          isUSDCTransfer: tokenMint === TOKEN_MINTS.USDC_DEVNET,
          actualTransferType: tokenMint === TOKEN_MINTS.SOL ? 'SOL' : 'USDC/SPL Token',
          transactionStructure: 'Grid account executes transaction, primary signer authorizes',
          note: 'Primary signer (wallet) authorizes Grid account to execute transaction'
        }
      }
    });
  } catch (error) {
    Logger.error('Error debugging transaction data:', error);
    res.status(500).json({ error: 'Failed to debug transaction data' });
  }
};

// Test transaction creation endpoint (for debugging)
export const testTransactionCreation = async (req: Request, res: Response) => {
  try {
    const { fromAddress, toAddress, tokenMint, amount } = req.body;

    if (!fromAddress || !toAddress || !tokenMint || !amount) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['fromAddress', 'toAddress', 'tokenMint', 'amount']
      });
    }

    Logger.info('Testing transaction creation:', { fromAddress, toAddress, tokenMint, amount });

    // Test blockchain connection
    const connectionTest = await blockchainService.testConnection();
    if (!connectionTest.success) {
      return res.status(500).json({
        error: 'Blockchain service unavailable',
        details: connectionTest.error
      });
    }

    // Create raw transaction
    const transactionResult = await blockchainService.createTransaction(
      fromAddress,
      toAddress,
      tokenMint,
      parseFloat(amount)
    );

    if (!transactionResult) {
      return res.status(500).json({
        error: 'Failed to create transaction',
        details: 'Transaction creation failed'
      });
    }

    // Validate base64 format using utility function
    const validation = validateBase64Transaction(transactionResult.transaction);

    res.json({
      message: 'Transaction created successfully',
      transaction: {
        base64: transactionResult.transaction,
        length: transactionResult.transaction.length,
        preview: transactionResult.transaction.substring(0, 20) + '...',
        fromAddress,
        toAddress,
        tokenMint,
        amount: parseFloat(amount)
      },
      validation: {
        isValid: validation.isValid,
        error: validation.error,
        transactionLength: transactionResult.transaction.length
      },
      blockchainInfo: {
        connectionTest: connectionTest,
        network: 'devnet',
        rpcUrl: 'https://api.devnet.solana.com'
      }
    });
  } catch (error) {
    Logger.error('Error testing transaction creation:', error);
    res.status(500).json({ error: 'Failed to test transaction creation' });
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

// ===========================================
// SESSION REFRESH ENDPOINTS
// ===========================================

// Refresh Privy session for existing authenticated user
export const refreshPrivySession = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as UserLoginInput;

    // Decode URL-encoded email address
    const decodedEmail = decodeURIComponent(email);

    // Check if user exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { email: decodedEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        authResult: true,
        sessionSecrets: true,
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

    if (!existingUser.gridAddress) {
      return res.status(400).json({
        message: 'User does not have a Grid account. Please complete account setup first.',
      });
    }

    // Initialize Grid authentication to refresh session
    const authResult = await gridClient.initAuth({
      email: existingUser.email,
    });

    if (!authResult?.success) {
      Logger.error('Grid session refresh failed:', authResult);
      return res.status(500).json({
        error: 'Failed to refresh Grid session',
        details: authResult?.error || 'Grid session refresh failed',
      });
    }

    Logger.info(`Grid session refresh initiated for user ${decodedEmail}`, {
      originalEmail: email,
      decodedEmail: decodedEmail
    });

    res.status(201).json({
      message: 'Session refresh initiated. Please complete authentication with OTP.',
      email: email,
      instructions: 'Check your email for the OTP code and use it with the complete session refresh endpoint',
      sessionExpired: true,
      authData: {
        success: authResult.success,
        data: authResult.data,
      },
    });
  } catch (error) {
    Logger.error('Error refreshing Privy session:', error);
    res.status(500).json({ error: 'Failed to refresh Privy session' });
  }
};

// Complete session refresh with OTP (simplified - no pending key)
export const completeSessionRefresh = async (req: Request, res: Response) => {
  try {
    const { email, otpCode } = req.body as CompleteLoginInput;

    if (!email || !otpCode) {
      return res.status(400).json({ 
        error: 'Email and OTP code are required' 
      });
    }

    // Decode URL-encoded email address
    const decodedEmail = decodeURIComponent(email);

    // Check if user exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { email: decodedEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        authResult: true,
        sessionSecrets: true,
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

    // Generate session secrets for the authenticated user
    const sessionSecrets = await gridClient.generateSessionSecrets();

    // Create a temporary user context for Grid SDK
    const tempUser = {
      email: existingUser.email,
      grid_user_id: existingUser.gridAddress || undefined,
      signers: [], // Empty signers array for existing account
    };

    // Complete Grid authentication to refresh session
    const authResult = await gridClient.completeAuth({
      user: tempUser,
      otpCode,
      sessionSecrets,
    });

    if (!authResult?.success) {
      Logger.error('Grid session refresh completion failed:', authResult);
      return res.status(401).json({
        error: 'Session refresh failed',
        details: authResult?.error || 'Invalid verification code',
      });
    }

    // Generate new JWT token
    const token = generateToken(existingUser.id);

    // Store the authentication data in the database for future transactions
    try {
      Logger.info('Attempting to store authentication data in database:', {
        userId: existingUser.id,
        email: existingUser.email,
        authDataKeys: Object.keys(authResult.data || {}),
        hasAuthentication: !!(authResult.data?.authentication),
        authenticationLength: authResult.data?.authentication?.length || 0
      });

      const updateResult = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          // Store Grid authentication data
          authResult: authResult.data as any || null,
          sessionSecrets: sessionSecrets as any || null,
        }
      });
      
      Logger.info(`Successfully stored authentication data for user ${existingUser.email}:`, {
        updatedUserId: updateResult.id,
        hasAuthResult: !!(updateResult as any).authResult,
        hasSessionSecrets: !!(updateResult as any).sessionSecrets,
      });
    } catch (dbError) {
      Logger.error('Failed to store authentication data in database:', {
        error: dbError,
        userId: existingUser.id,
        email: existingUser.email,
        errorMessage: dbError instanceof Error ? dbError.message : 'Unknown error',
        errorStack: dbError instanceof Error ? dbError.stack : undefined
      });
      // Continue with response even if database update fails
    }

    Logger.info(`Grid session refresh completed successfully for user ${existingUser.email}`);

    return res.status(200).json({
      message: 'Session refreshed successfully',
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
      sessionRefreshed: true,
      authData: {
        success: authResult.success,
        data: authResult.data,
      },
    });
  } catch (error) {
    Logger.error('Error completing session refresh:', error);
    res.status(500).json({ error: 'Failed to complete session refresh' });
  }
};

// Check session status and provide refresh guidance
export const checkSessionStatus = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    // Decode URL-encoded email address
    const decodedEmail = decodeURIComponent(email);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: decodedEmail },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        walletAddress: true,
        gridAddress: true,
        gridStatus: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is inactive. Please contact support.' });
    }

    if (!user.gridAddress) {
      return res.status(400).json({
        message: 'User does not have a Grid account. Please complete account setup first.',
      });
    }

    // Calculate session age (assuming 24-hour expiry)
    const sessionAge = Date.now() - user.updatedAt.getTime();
    const sessionExpiryMs = 24 * 60 * 60 * 1000; // 24 hours
    const isSessionExpired = sessionAge > sessionExpiryMs;

    Logger.info(`Session status check for user ${decodedEmail}:`, {
      originalEmail: email,
      decodedEmail: decodedEmail,
      sessionAge: Math.round(sessionAge / (60 * 60 * 1000)), // hours
      isSessionExpired,
      gridAddress: user.gridAddress,
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
      },
      sessionStatus: {
        isExpired: isSessionExpired,
        sessionAgeHours: Math.round(sessionAge / (60 * 60 * 1000)),
        sessionExpiryHours: 24,
        needsRefresh: isSessionExpired,
        lastUpdated: user.updatedAt,
      },
      guidance: {
        message: isSessionExpired 
          ? 'Your Privy session has expired. Please refresh your session to continue.'
          : 'Your session is still valid.',
        action: isSessionExpired 
          ? 'Call /api/users/refresh-session to refresh your session'
          : 'No action needed',
        expiryInfo: {
          sessionExpiresAfter: '24 hours',
          otpExpiresAfter: '15 minutes',
        },
      },
    });
  } catch (error) {
    Logger.error('Error checking session status:', error);
    res.status(500).json({ error: 'Failed to check session status' });
  }
};