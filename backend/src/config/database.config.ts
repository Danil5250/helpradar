import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
import { AppConfig, isLocalHost, loadAppConfig } from './app.config';
import { ALL_ENTITIES } from './entities';
import { SnakeNamingStrategy } from './naming-strategy';

/**
 * Refuses to touch a non-local database outside production unless ALLOW_REMOTE_DB=true. This keeps a
 * leftover remote host in `.env` (e.g. the legacy project database) from being migrated by accident.
 */
export function assertSafeDatabase(config: AppConfig): void {
  const { db, isProduction } = config;
  if (!isProduction && !db.allowRemote && !isLocalHost(db.host)) {
    throw new Error(
      `Refusing to use the remote database "${db.host}" in ${config.nodeEnv} mode. ` +
        'Set DB_HOST=localhost in backend/.env.local (or ALLOW_REMOTE_DB=true to override).',
    );
  }
}

export function buildDataSourceOptions(
  config: AppConfig = loadAppConfig(),
): DataSourceOptions {
  assertSafeDatabase(config);
  const { db } = config;
  const extension = __filename.endsWith('.ts') ? 'ts' : 'js';
  return {
    type: 'postgres',
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    ssl: db.ssl ? { rejectUnauthorized: db.sslRejectUnauthorized } : false,
    entities: ALL_ENTITIES,
    migrations: [join(__dirname, '..', 'migrations', `*.${extension}`)],
    migrationsRun: db.migrationsRun,
    synchronize: false,
    // gen_random_uuid() is built into PostgreSQL 13+, so no extension (and no superuser) is needed
    uuidExtension: 'pgcrypto',
    installExtensions: false,
    namingStrategy: new SnakeNamingStrategy(),
    logging: ['error', 'warn'],
  };
}
