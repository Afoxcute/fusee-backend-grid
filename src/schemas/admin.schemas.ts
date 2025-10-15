// src/schemas/admin.schemas.ts
import { z } from 'zod';

// Wallet address validation regex (supports various blockchain addresses)
// Supports: Ethereum (0x...), Solana (base58), Bitcoin (1... or 3...), etc.
const walletAddressRegex = /^(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/;

// Admin permission enum
export const AdminPermissionEnum = z.enum([
  'CAN_INITIATE',
  'CAN_VOTE',
  'CAN_EXECUTE', 
  'CAN_MANAGE_USERS',
  'CAN_MANAGE_ADMINS'
]);

// Create admin validation schema
export const createAdminSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters'),
  
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  walletAddress: z
    .string()
    .max(100, 'Wallet address must be less than 100 characters')
    .regex(walletAddressRegex, 'Please provide a valid wallet address (Ethereum, Solana, Bitcoin, etc.)')
    .optional(),
  
  permissions: z
    .array(AdminPermissionEnum)
    .min(1, 'At least one permission is required')
    .max(4, 'Maximum 4 permissions allowed'),
});

// Update admin validation schema
export const updateAdminSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters')
    .optional(),
  
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),
  
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),
  
  walletAddress: z
    .string()
    .max(100, 'Wallet address must be less than 100 characters')
    .regex(walletAddressRegex, 'Please provide a valid wallet address (Ethereum, Solana, Bitcoin, etc.)')
    .optional()
    .or(z.literal('')),
  
  permissions: z
    .array(AdminPermissionEnum)
    .min(1, 'At least one permission is required')
    .max(4, 'Maximum 4 permissions allowed')
    .optional(),
  
  isActive: z
    .boolean()
    .optional(),
});

// Grid account creation with admin permissions schema
export const createGridAccountWithPermissionsSchema = z.object({
  userEmail: z
    .string()
    .email('Please provide a valid user email address')
    .min(1, 'User email is required'),
  
  adminEmails: z
    .array(z.string().email('Please provide valid admin email addresses'))
    .min(1, 'At least one admin email is required')
    .max(10, 'Maximum 10 admin emails allowed'),
  
  threshold: z
    .number()
    .min(1, 'Threshold must be at least 1')
    .max(10, 'Threshold cannot exceed 10')
    .default(2),
});


// Custom signer admin creation schema
export const createCustomSignerAdminSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters'),
  
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  permissions: z
    .array(AdminPermissionEnum)
    .min(1, 'At least one permission is required')
    .max(4, 'Maximum 4 permissions allowed')
    .default(['CAN_VOTE', 'CAN_EXECUTE']), // Remove CAN_INITIATE from default - admins shouldn't initiate user transactions
  
  // Optional: provide existing keypair (base58 encoded secret key)
  secretKey: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true; // Optional field
      // Validate base58 format (Solana keypair format)
      return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(val);
    }, 'Secret key must be a valid base58 encoded Solana keypair'),
});

// Type exports for TypeScript
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
export type CreateGridAccountWithPermissionsInput = z.infer<typeof createGridAccountWithPermissionsSchema>;
export type CreateCustomSignerAdminInput = z.infer<typeof createCustomSignerAdminSchema>;
export type AdminPermission = z.infer<typeof AdminPermissionEnum>;
