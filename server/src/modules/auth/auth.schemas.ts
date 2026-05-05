import { z } from 'zod';

export const allowedEmailDomains = ['apec.edu.kz', 'gmail.com', 'mail.ru', 'outlook.com'] as const;

const allowedEmailDomainMessage =
  'Use an email from apec.edu.kz, gmail.com, mail.ru, or outlook.com';

function getEmailDomain(email: string) {
  return email.trim().toLowerCase().split('@').pop() ?? '';
}

export function isAllowedEmailDomain(email: string) {
  return allowedEmailDomains.includes(getEmailDomain(email) as (typeof allowedEmailDomains)[number]);
}

const registrationEmailSchema = z
  .string()
  .trim()
  .max(254)
  .email()
  .refine(isAllowedEmailDomain, allowedEmailDomainMessage);

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  email: registrationEmailSchema,
  password: z
    .string()
    .min(10)
    .max(128)
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[a-z]/, 'Password must include a lowercase letter')
    .regex(/[0-9]/, 'Password must include a number'),
});

export const loginSchema = z.object({
  email: z.string().trim().max(254).email(),
  password: z.string().min(1).max(128),
});

export const verifyEmailSchema = z.object({
  email: z.string().trim().max(254).email(),
  code: z.string().trim().regex(/^\d{6}$/, 'Verification code must be 6 digits'),
});

export const resendEmailVerificationSchema = z.object({
  email: z.string().trim().max(254).email(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendEmailVerificationInput = z.infer<typeof resendEmailVerificationSchema>;

