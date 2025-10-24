import { z } from 'zod';

export const completeLoginSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .min(1, 'Email is required'),
  otpCode: z.string().regex(/^[0-9]{6}$/, 'OTP code must be exactly 6 digits'),
});

export type CompleteLoginInput = z.infer<typeof completeLoginSchema>;

export const verifyTokenSchema = z.object({
  token: z.string(),
});

export type VerifyTokenInput = z.infer<typeof verifyTokenSchema>;
