import { z } from 'zod';

export const completeLoginSchema = z.object({
  pendingKey: z.string(),
  otpCode: z.string(),
});

export type CompleteLoginInput = z.infer<typeof completeLoginSchema>;

export const verifyTokenSchema = z.object({
  token: z.string(),
});

export type VerifyTokenInput = z.infer<typeof verifyTokenSchema>;
