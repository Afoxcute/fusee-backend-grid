// src/schemas/user.schemas.ts
import { z } from 'zod';

// Phone number validation regex (supports international formats)
// Supports: +1234567890, +2348101872122, (123) 456-7890, 123-456-7890, etc.
const phoneRegex = /^(\+?[1-9]\d{1,14})|(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})$/;

// Wallet address validation regex (supports various blockchain addresses)
// Supports: Ethereum (0x...), Solana (base58), Bitcoin (1... or 3...), etc.
const walletAddressRegex = /^(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/;

// Create user validation schema
export const createUserSchema = z.object({
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
  
  middleName: z
    .string()
    .max(50, 'Middle name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]*$/, 'Middle name can only contain letters, spaces, hyphens, and apostrophes')
    .optional()
    .or(z.literal('')),
  
  phoneNumber: z
    .string()
    .regex(phoneRegex, 'Please provide a valid phone number (e.g., +1234567890, +2348101872122, (123) 456-7890)')
    .optional()
    .or(z.literal('')),
});

// Update user validation schema
export const updateUserSchema = z.object({
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
  
  middleName: z
    .string()
    .max(50, 'Middle name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]*$/, 'Middle name can only contain letters, spaces, hyphens, and apostrophes')
    .optional()
    .or(z.literal('')),
  
  phoneNumber: z
    .string()
    .regex(phoneRegex, 'Please provide a valid phone number (e.g., +1234567890, +2348101872122, (123) 456-7890)')
    .optional()
    .or(z.literal('')),
});

// Grid account initiation schema
export const initiateGridAccountSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .min(1, 'Email is required'),
  
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
  
  middleName: z
    .string()
    .max(50, 'Middle name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]*$/, 'Middle name can only contain letters, spaces, hyphens, and apostrophes')
    .optional()
    .or(z.literal('')),
  
  phoneNumber: z
    .string()
    .regex(phoneRegex, 'Please provide a valid phone number (e.g., +1234567890, +2348101872122, (123) 456-7890)')
    .optional()
    .or(z.literal('')),
});

// Grid account completion schema (simplified - no pending key)
export const completeGridAccountSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .min(1, 'Email is required'),
  otpCode: z.string().regex(/^[0-9]{6}$/, 'OTP code must be exactly 6 digits'),
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
  middleName: z
    .string()
    .max(50, 'Middle name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]*$/, 'Middle name can only contain letters, spaces, hyphens, and apostrophes')
    .optional()
    .or(z.literal('')),
  phoneNumber: z
    .string()
    .regex(phoneRegex, 'Please provide a valid phone number (e.g., +1234567890, +2348101872122, (123) 456-7890)')
    .optional()
    .or(z.literal('')),
});

// User login schema
export const gridLoginSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters'),
});

// Type exports for TypeScript
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type InitiateGridAccountInput = z.infer<typeof initiateGridAccountSchema>;
export type CompleteGridAccountInput = z.infer<typeof completeGridAccountSchema>;
export type UserLoginInput = z.infer<typeof gridLoginSchema>;

