export const SESSION_COOKIE = 'hr_session';

/** SRS 3.2.2.3: the session token is valid for 24 hours. */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
/** SRS 3.2.1.3: the verification token is valid for 24 hours. */
export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
/** SRS 3.2.1.3 step 9: accounts that are not verified within 7 days are deleted. */
export const UNVERIFIED_ACCOUNT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** SRS 3.2.2.5: 5 failed attempts within 15 minutes lock the account for 15 minutes. */
export const MAX_FAILED_LOGINS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;
/** A verification e-mail can be requested again after this pause. */
export const RESEND_COOLDOWN_MS = 60 * 1000;
