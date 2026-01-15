import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().default('5000'),

  // Database
  MONGODB_URI: z.string().min(1, 'MongoDB URI is required'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'Refresh secret must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // AWS (optional for now, required in Exercise 3)
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),

  // Other configs
  ALLOWED_ORIGINS: z.string().optional(),
  MAX_FILE_SIZE: z.string().default('52428800'), // 50MB
});

const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    process.exit(1);
  }
};

export const env = parseEnv();

export const config = {
  port: parseInt(env.PORT, 10),
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  maxFileSize: parseInt(env.MAX_FILE_SIZE, 10),
  // rateLimitWindowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
  // rateLimitMaxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
  allowedOrigins: env.ALLOWED_ORIGINS?.split(',').map((origin) =>
    origin.trim()
  ) || ['http://localhost:3000'],
};
