import { z } from 'zod';

// Transaction schemas for Grid SDK transaction operations

// Base transaction input schema
const baseTransactionSchema = z.object({
  fromEmail: z.string().email('Invalid sender email address'),
  toEmail: z.string().email('Invalid recipient email address'),
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a valid number'),
  memo: z.string().optional(),
});

// Prepare transaction schema
export const prepareTransactionSchema = baseTransactionSchema.extend({
  tokenMint: z.string().min(1, 'Token mint address is required'),
});

// Execute transaction schema
export const executeTransactionSchema = z.object({
  fromEmail: z.string().email('Invalid sender email address'),
  transactionPayload: z.object({
    transaction: z.string().min(1, 'Transaction data is required'),
    transaction_signers: z.array(z.string()).min(1, 'Transaction signers are required'),
    kms_payloads: z.array(z.object({
      provider: z.string(),
      address: z.string(),
      payload: z.string(),
    })).optional(),
  }),
  memo: z.string().optional(),
});

// Send transaction schema (combines prepare and execute)
export const sendTransactionSchema = baseTransactionSchema.extend({
  tokenMint: z.string().min(1, 'Token mint address is required'),
});

// SOL transaction schema
export const sendSolTransactionSchema = baseTransactionSchema.extend({
  tokenMint: z.literal('So11111111111111111111111111111111111111112').optional(),
});

// USDC transaction schema
export const sendUsdcTransactionSchema = baseTransactionSchema.extend({
  tokenMint: z.literal('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU').optional(),
});

// Type exports
export type PrepareTransactionInput = z.infer<typeof prepareTransactionSchema>;
export type ExecuteTransactionInput = z.infer<typeof executeTransactionSchema>;
export type SendTransactionInput = z.infer<typeof sendTransactionSchema>;
export type SendSolTransactionInput = z.infer<typeof sendSolTransactionSchema>;
export type SendUsdcTransactionInput = z.infer<typeof sendUsdcTransactionSchema>;
