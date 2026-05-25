/**
 * Environment configuration — typed wrapper around process.env values.
 *
 * Loaded from .env via dotenv. Defaults are provided for local dev so the
 * project remains runnable without a .env file present, but real credentials
 * and the actual BASE_URL must come from .env (never committed).
 *
 * Pick environment with TEST_ENV=dev|sit|uat (defaults to dev).
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const env = (process.env.TEST_ENV ?? 'dev').toLowerCase();

export const ENV = {
  name: env,
  baseUrl:           process.env.BASE_URL          ?? 'http://172.20.3.113:7777',
  user:              process.env.OBDX_USER         ?? 'corpmaker2',
  password:          process.env.OBDX_PASSWORD     ?? 'Admin@131',
  defaultTimeout:    Number(process.env.DEFAULT_TIMEOUT    ?? 30_000),
  navigationTimeout: Number(process.env.NAVIGATION_TIMEOUT ?? 60_000),
  testTimeout:       Number(process.env.TEST_TIMEOUT       ?? 180_000),
} as const;

export type EnvConfig = typeof ENV;
