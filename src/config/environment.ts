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

  // Arcjet
  ARCJET_KEY: z.string().min(1, 'Arcjet API key is required'),
  ARCJET_ENV: z.string().default('development'),

  // AWS S3
  AWS_REGION: z.string().min(1, 'AWS region is required'),
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS access key is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS secret key is required'),
  S3_BUCKET_NAME: z.string().min(1, 'S3 bucket name is required'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),

  // CORS
  ALLOWED_ORIGINS: z.string().optional(),

  // File Upload
  MAX_FILE_SIZE: z.string().default('52428800'), // 50MB
  ALLOWED_FILE_TYPES: z
    .string()
    .default('image/jpeg,image/png,application/pdf'),

  // Logging
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug'])
    .default('debug')
    .optional(),
});

type EnvSchema = z.infer<typeof envSchema>;

const parseEnv = (): EnvSchema => {
  try {
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error('❌ Error parsing environment variables:', error);
    }
    process.exit(1);
  }
};

export const env = parseEnv();

// Helper to get parsed values with proper types
export const config = {
  port: parseInt(env.PORT, 10),
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  maxFileSize: parseInt(env.MAX_FILE_SIZE, 10),
  rateLimitWindowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
  rateLimitMaxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
  allowedOrigins: env.ALLOWED_ORIGINS?.split(',').map((origin) =>
    origin.trim()
  ) || ['http://localhost:3000'],
  arcjet: {
    key: env.ARCJET_KEY,
    env: env.ARCJET_ENV,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  aws: {
    region: env.AWS_REGION,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    s3BucketName: env.S3_BUCKET_NAME,
  },
  allowedFileTypes: env.ALLOWED_FILE_TYPES.split(',').map((type) =>
    type.trim()
  ),
};
