import path from 'node:path';
import { config } from 'dotenv';
import { z } from 'zod';

const rootEnvPath = path.resolve(__dirname, '../../../.env');

config({ path: rootEnvPath });

const booleanStringSchema = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://postgres:postgres@localhost:5433/dashforge?schema=public'),
  JWT_SECRET: z.string().min(12).default('local-demo-secret'),
  JWT_ISSUER: z.string().min(1).default('dashforge'),
  JWT_AUDIENCE: z.string().min(1).default('dashforge-client'),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  REQUEST_BODY_LIMIT: z.string().default('2mb'),
  TRUST_PROXY: booleanStringSchema,
  ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  ADMIN_PASSWORD: z.string().min(8).default('Admin123!'),
  ADMIN_USERNAME: z.string().min(3).default('admin'),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: booleanStringSchema,
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default(''),
});

const parsedEnv = envSchema.parse(process.env);

if (parsedEnv.NODE_ENV === 'production') {
  const unsafeSettings: string[] = [];

  if (!process.env.DATABASE_URL) {
    unsafeSettings.push('DATABASE_URL must be set explicitly');
  }

  if (
    !process.env.JWT_SECRET ||
    parsedEnv.JWT_SECRET.length < 32 ||
    parsedEnv.JWT_SECRET === 'local-demo-secret' ||
    parsedEnv.JWT_SECRET === 'change-me-for-production'
  ) {
    unsafeSettings.push('JWT_SECRET must be at least 32 characters and replaced with a strong secret');
  }

  if (!process.env.CLIENT_ORIGIN || parsedEnv.CLIENT_ORIGIN.includes('*')) {
    unsafeSettings.push('CLIENT_ORIGIN must list trusted production origins');
  }

  const clientOrigins = parsedEnv.CLIENT_ORIGIN.split(',').map((origin) => origin.trim());

  if (
    clientOrigins.some(
      (origin) =>
        origin.startsWith('http://') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1'),
    )
  ) {
    unsafeSettings.push('CLIENT_ORIGIN must use HTTPS production origins');
  }

  if (!process.env.ADMIN_PASSWORD || parsedEnv.ADMIN_PASSWORD === 'Admin123!') {
    unsafeSettings.push('ADMIN_PASSWORD must not use the demo password');
  }

  if (!process.env.ADMIN_EMAIL || parsedEnv.ADMIN_EMAIL === 'admin@example.com') {
    unsafeSettings.push('ADMIN_EMAIL must not use the demo admin email');
  }

  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS ||
    !process.env.SMTP_FROM
  ) {
    unsafeSettings.push('SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM must be configured');
  }

  if (unsafeSettings.length) {
    throw new Error(`Unsafe production configuration: ${unsafeSettings.join('; ')}`);
  }
}

export const env = parsedEnv;

process.env.DATABASE_URL ??= env.DATABASE_URL;
