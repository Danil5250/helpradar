import { registerAs } from '@nestjs/config';
import './env';

export interface AppConfig {
  nodeEnv: string;
  isProduction: boolean;
  isTest: boolean;
  port: number;
  appUrl: string;
  corsOrigins: string[];
  trustProxy: boolean | number | string;
  bcryptRounds: number;
  rateLimit: { accountPerMinute: number; authIpPerMinute: number };
  db: {
    host: string;
    port: number;
    username: string;
    password: string | undefined;
    database: string;
    ssl: boolean;
    sslRejectUnauthorized: boolean;
    migrationsRun: boolean;
    allowRemote: boolean;
  };
  storage: { dir: string; urlSecret: string };
  /** Extra stop words (comma separated STOP_WORDS) on top of the built-in list. */
  extraStopWords: string[];
}

const DEV_FILE_URL_SECRET = 'dev-only-insecure-secret-change-me';

const bool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const int = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const list = (value: string | undefined, fallback: string[]): string[] => {
  const items = (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
};

const trustProxy = (value: string | undefined): boolean | number | string => {
  if (value === undefined || value.trim() === '') return false;
  const normalized = value.trim().toLowerCase();
  if (['true', 'yes', 'on'].includes(normalized)) return true;
  if (['false', 'no', 'off', '0'].includes(normalized)) return false;
  const hops = Number.parseInt(normalized, 10);
  return Number.isFinite(hops) ? hops : value.trim();
};

export function isLocalHost(host: string): boolean {
  return ['localhost', '127.0.0.1', '::1', '[::1]', 'postgres', 'db'].includes(
    host.trim().toLowerCase(),
  );
}

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';
  const appUrl = (env.APP_URL ?? 'http://localhost:5173').replace(/\/+$/, '');

  const fileUrlSecret = env.FILE_URL_SECRET?.trim();
  if (isProduction && (!fileUrlSecret || fileUrlSecret.length < 16)) {
    throw new Error(
      'FILE_URL_SECRET (at least 16 characters) is required in production.',
    );
  }

  return {
    nodeEnv,
    isProduction,
    isTest: nodeEnv === 'test',
    port: int(env.PORT, 8080),
    appUrl,
    corsOrigins: list(env.CORS_ORIGINS, [appUrl]),
    trustProxy: trustProxy(env.TRUST_PROXY),
    bcryptRounds: int(env.BCRYPT_ROUNDS, 12),
    rateLimit: {
      accountPerMinute: int(env.RATE_LIMIT_PER_MINUTE, 100),
      authIpPerMinute: int(env.AUTH_RATE_LIMIT_PER_MINUTE, 10),
    },
    db: {
      host: env.DB_HOST ?? 'localhost',
      port: int(env.DB_PORT, 5432),
      username: env.DB_USERNAME || env.USER || 'postgres',
      password: env.DB_PASSWORD ? env.DB_PASSWORD : undefined,
      database: env.DB_NAME ?? 'helpradar',
      ssl: bool(env.DB_SSL, false),
      sslRejectUnauthorized: bool(env.DB_SSL_REJECT_UNAUTHORIZED, true),
      migrationsRun: bool(env.DB_MIGRATIONS_RUN, true),
      allowRemote: bool(env.ALLOW_REMOTE_DB, false),
    },
    storage: {
      dir: env.STORAGE_DIR?.trim() || './storage',
      urlSecret: fileUrlSecret || DEV_FILE_URL_SECRET,
    },
    extraStopWords: list(env.STOP_WORDS, []),
  };
}

export default registerAs('app', () => loadAppConfig());
