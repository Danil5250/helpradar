import { Client } from 'pg';
import { applyTestEnv } from './utils/test-env';

/** Starts every test run with an empty schema, so the migrations are verified on a fresh database too. */
export default async function globalSetup(): Promise<void> {
  const { database } = applyTestEnv();
  const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USERNAME || process.env.USER || 'postgres',
    password: process.env.DB_PASSWORD || undefined,
    database,
  });
  await client.connect();
  try {
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  } finally {
    await client.end();
  }
}
