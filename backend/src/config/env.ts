import * as path from 'path';
import * as dotenv from 'dotenv';

let loaded = false;

/**
 * Loads the environment files once. `.env.local` (local development overrides) is read first and
 * therefore wins over `.env`. Variables that already exist in `process.env` are never overwritten,
 * so real environment variables (production, CI, tests) always have the highest priority.
 */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  for (const file of ['.env']) {
    dotenv.config({ path: path.resolve(process.cwd(), file) });
  }
}

loadEnv();
