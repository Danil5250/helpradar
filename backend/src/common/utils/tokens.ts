import { createHash, randomBytes } from 'crypto';

/** Opaque, unguessable token (256 bits). Only its SHA-256 hash is stored in the database. */
export const generateToken = (): string =>
  randomBytes(32).toString('base64url');

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
