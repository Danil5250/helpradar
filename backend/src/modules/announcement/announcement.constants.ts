/** SRS 3.2.6.3 step 4: results are returned in pages of 20 cards. */
export const PAGE_SIZE = 20;
/** SRS 3.2.4.3 step 5: a user can have fewer than 10 active announcements. */
export const MAX_ACTIVE_ANNOUNCEMENTS = 10;
/** SRS 3.2.4.2: expiry period 1-30 days, 14 by default. */
export const DEFAULT_EXPIRY_DAYS = 14;
export const MIN_EXPIRY_DAYS = 1;
export const MAX_EXPIRY_DAYS = 30;
/** SRS 3.2.5.3 step 5: "Extend" adds up to 14 days. */
export const MAX_EXTEND_DAYS = 14;
/** SRS 3.2.5.3 step 6: a closed announcement can be published again within 30 days. */
export const REPUBLISH_WINDOW_DAYS = 30;
/** SRS 3.2.5.3 step 5: reminder 24 hours before the expiry date. */
export const REMINDER_BEFORE_EXPIRY_HOURS = 24;
/** SRS 3.2.4.2: up to 5 photos, JPEG/PNG/WebP, up to 10 MB each. */
export const MAX_PHOTOS = 5;
/** SRS 3.2.4.3 step 7: the public location is shifted by up to 300 m. */
export const APPROX_MIN_METERS = 50;
export const APPROX_MAX_METERS = 300;
/** An edit that moves the exact point by less than this keeps the existing public point (avoids averaging attacks). */
export const LOCATION_UNCHANGED_METERS = 10;

export const DAY_MS = 24 * 60 * 60 * 1000;
