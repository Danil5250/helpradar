import { NextFunction, Request, Response } from 'express';
import { SESSION_COOKIE } from '../modules/auth/auth.constants';
import { ERR } from './errors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF protection (OWASP, SRS 3.5.4): a state changing request that is authenticated by the
 * session cookie must come from one of the allowed web client origins. Requests that use an
 * explicit `Authorization` header (API / mobile clients) are not affected because browsers do
 * not attach that header cross-site on their own.
 */
export function createOriginCheck(allowedOrigins: string[]) {
  const allowed = new Set(
    allowedOrigins.map((origin) => origin.replace(/\/+$/, '')),
  );

  return (req: Request, res: Response, next: NextFunction): void => {
    if (
      SAFE_METHODS.has(req.method) ||
      req.headers.authorization ||
      !req.cookies?.[SESSION_COOKIE]
    ) {
      next();
      return;
    }
    let origin = req.headers.origin;
    if (!origin && req.headers.referer) {
      try {
        origin = new URL(req.headers.referer).origin;
      } catch {
        origin = undefined;
      }
    }
    if (origin && allowed.has(origin)) {
      next();
      return;
    }
    res.status(ERR.ORIGIN_NOT_ALLOWED.status).json({
      statusCode: ERR.ORIGIN_NOT_ALLOWED.status,
      code: 'ORIGIN_NOT_ALLOWED',
      message: ERR.ORIGIN_NOT_ALLOWED.message,
    });
  };
}
