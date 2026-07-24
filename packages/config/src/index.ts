import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().default('3000'),
  API_URL: z.string().url().optional(),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

let config: EnvConfig | null = null;

export function initConfig() {
  if (config) return config;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment configuration:');
    console.error(result.error.format());
    throw new Error('Invalid environment configuration');
  }

  config = result.data;
  return config;
}

export function getConfig(): EnvConfig {
  if (!config) {
    return initConfig();
  }
  return config;
}

const appConfigSchema = z.object({
  cors: z.object({
    origin: z.string().default('*'),
    credentials: z.boolean().default(true),
  }),
  rateLimit: z.object({
    windowMs: z.number().positive().default(900000),
    max: z.number().positive().default(100),
  }),
  pagination: z.object({
    defaultLimit: z.number().positive().default(20),
    maxLimit: z.number().positive().default(100),
  }),
  test: z.object({
    defaultTimeout: z.number().positive().default(30000),
    maxRetries: z.number().min(0).default(3),
  }),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export const appConfig: AppConfig = appConfigSchema.parse({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
  test: {
    defaultTimeout: 30000,
    maxRetries: 3,
  },
});