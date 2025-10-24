import { z } from 'zod';

// Base schemas
export const luloOwnerSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const luloAmountSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
});

export const luloMintSchema = z.object({
  mintAddress: z.string().min(1, 'Mint address is required'),
});

// Initialize Referrer
export const initializeReferrerSchema = z.object({
  email: z.string().email('Invalid email format'),
  priorityFee: z.string().optional(),
});

// Deposit
export const depositSchema = z.object({
  email: z.string().email('Invalid email format'),
  mintAddress: z.string().min(1, 'Mint address is required'),
  regularAmount: z.number().min(0, 'Regular amount must be non-negative').optional(),
  protectedAmount: z.number().min(0, 'Protected amount must be non-negative').optional(),
  referrer: z.string().optional(),
  priorityFee: z.string().optional(),
}).refine(
  (data) => data.regularAmount !== undefined || data.protectedAmount !== undefined,
  {
    message: 'At least one amount (regular or protected) must be provided',
    path: ['regularAmount', 'protectedAmount'],
  }
);

// Withdraw Protected
export const withdrawProtectedSchema = z.object({
  email: z.string().email('Invalid email format'),
  mintAddress: z.string().min(1, 'Mint address is required'),
  amount: z.number().positive('Amount must be positive'),
  priorityFee: z.string().optional(),
});

// Initiate Regular Withdraw
export const initiateRegularWithdrawSchema = z.object({
  email: z.string().email('Invalid email format'),
  mintAddress: z.string().min(1, 'Mint address is required'),
  amount: z.number().positive('Amount must be positive'),
  priorityFee: z.string().optional(),
});

// Complete Regular Withdrawal
export const completeRegularWithdrawalSchema = z.object({
  email: z.string().email('Invalid email format'),
  pendingWithdrawalId: z.number().int().positive('Pending withdrawal ID must be a positive integer'),
  priorityFee: z.string().optional(),
});

// Get Account Data
export const getAccountSchema = z.object({
  email: z.string().email('Invalid email format'),
});

// Get Pending Withdrawals
export const getPendingWithdrawalsSchema = z.object({
  email: z.string().email('Invalid email format'),
});

// Get Pools
export const getPoolsSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
});

// Get Rates
export const getRatesSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
});

// Get Referrer
export const getReferrerSchema = z.object({
  email: z.string().email('Invalid email format'),
});

// Type exports
export type InitializeReferrerInput = z.infer<typeof initializeReferrerSchema>;
export type DepositInput = z.infer<typeof depositSchema>;
export type WithdrawProtectedInput = z.infer<typeof withdrawProtectedSchema>;
export type InitiateRegularWithdrawInput = z.infer<typeof initiateRegularWithdrawSchema>;
export type CompleteRegularWithdrawalInput = z.infer<typeof completeRegularWithdrawalSchema>;
export type GetAccountInput = z.infer<typeof getAccountSchema>;
export type GetPendingWithdrawalsInput = z.infer<typeof getPendingWithdrawalsSchema>;
export type GetPoolsInput = z.infer<typeof getPoolsSchema>;
export type GetRatesInput = z.infer<typeof getRatesSchema>;
export type GetReferrerInput = z.infer<typeof getReferrerSchema>;
