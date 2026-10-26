/* eslint-disable */
// Development helper: creates the application database when it does not exist yet, so that
// "npm run start:dev" works on a fresh machine without any manual SQL.
//   node scripts/ensure-database.js          -> DB_NAME (default "helpradar")
//   node scripts/ensure-database.js --test   -> "<DB_NAME>_test" (used by the e2e tests)
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

// same precedence as the application: .env.local first, then .env, real env vars always win
for (const file of ['.env.local', '.env']) {
  dotenv.config({ path: path.resolve(process.cwd(), file) });
}

const env = process.env;
if ((env.NODE_ENV || 'development') === 'production') {
  console.log('[db] production mode: not creating databases automatically.');
  process.exit(0);
}

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]', 'postgres', 'db'];
const host = env.DB_HOST || 'localhost';
const allowRemote = ['1', 'true', 'yes', 'on'].includes(String(env.ALLOW_REMOTE_DB || '').toLowerCase());
if (!LOCAL_HOSTS.includes(host.toLowerCase()) && !allowRemote) {
  console.error(
    `[db] Refusing to use the remote database "${host}" in development mode.\n` +
      '     Set DB_HOST=localhost in backend/.env.local (or ALLOW_REMOTE_DB=true to override).',
  );
  process.exit(1);
}

const baseName = env.DB_NAME || 'helpradar';
const database = process.argv.includes('--test') ? `${baseName}_test` : baseName;
if (!/^[A-Za-z0-9_]+$/.test(database)) {
  console.error(`[db] Invalid database name "${database}" (letters, digits and underscores only).`);
  process.exit(1);
}

const ssl = ['1', 'true', 'yes', 'on'].includes(String(env.DB_SSL || '').toLowerCase())
  ? { rejectUnauthorized: !['0', 'false', 'no', 'off'].includes(String(env.DB_SSL_REJECT_UNAUTHORIZED || '').toLowerCase()) }
  : false;

async function main() {
  const client = new Client({
    host,
    port: Number(env.DB_PORT || 5432),
    user: env.DB_USERNAME || env.USER || 'postgres',
    password: env.DB_PASSWORD || undefined,
    database: 'postgres',
    ssl,
  });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (rowCount === 0) {
      await client.query(`CREATE DATABASE "${database}"`);
      console.log(`[db] created database "${database}"`);
    } else {
      console.log(`[db] database "${database}" already exists`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[db] Could not connect to PostgreSQL at ${host}:${env.DB_PORT || 5432}: ${error.message}`);
  console.error('     Make sure PostgreSQL is running and DB_USERNAME / DB_PASSWORD in backend/.env.local are correct.');
  process.exit(1);
});
