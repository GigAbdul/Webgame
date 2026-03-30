import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://postgres:postgres@localhost:5432/dashforge?schema=public'),
  JWT_SECRET: z.string().min(12).default('local-demo-secret'),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  ADMIN_PASSWORD: z.string().min(8).default('Admin123!'),
  ADMIN_USERNAME: z.string().min(3).default('admin'),
});

export const env = envSchema.parse(process.env);
