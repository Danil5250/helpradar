import { HttpException } from '@nestjs/common';

/**
 * Catalogue of API errors. The `message` texts of the registration, login and announcement
 * flows are the literal texts from the SRS (sections 3.2.1, 3.2.2, 3.2.4 - 3.2.7); the web
 * client translates them by `code`.
 */
export const ERR = {
  VALIDATION_FAILED: {
    status: 400,
    message: 'Please correct the highlighted fields.',
  },
  BAD_REQUEST: { status: 400, message: 'The request is invalid.' },
  UNAUTHORIZED: { status: 401, message: 'Please log in to continue.' },
  FORBIDDEN: {
    status: 403,
    message: 'You do not have permission to perform this action.',
  },
  NOT_FOUND: { status: 404, message: 'The requested resource was not found.' },
  PAYLOAD_TOO_LARGE: { status: 413, message: 'The request is too large.' },
  RATE_LIMITED: {
    status: 429,
    message: 'Too many requests. Please try again later.',
  },
  INTERNAL_ERROR: {
    status: 500,
    message: 'Something went wrong. Please try again later.',
  },
  ORIGIN_NOT_ALLOWED: {
    status: 403,
    message: 'The request origin is not allowed.',
  },

  // 3.2.1 Registration
  EMAIL_TAKEN: {
    status: 409,
    message:
      'An account with this email already exists. Log in or restore your password.',
  },
  LINK_INVALID: { status: 400, message: 'This link is no longer valid.' },

  // 3.2.2 Login and logout
  INVALID_CREDENTIALS: { status: 401, message: 'Invalid email or password.' },
  TOO_MANY_ATTEMPTS: {
    status: 429,
    message: 'Too many attempts. Try again in 15 minutes.',
  },
  EMAIL_NOT_VERIFIED: {
    status: 403,
    message: 'Please confirm your email first.',
  },
  ACCOUNT_BLOCKED: { status: 403, message: 'Your account is blocked.' },

  // 3.2.4 - 3.2.7 Announcements
  ROLE_NOT_ALLOWED: {
    status: 403,
    message: 'Only Persons in Need and Volunteers can publish announcements.',
  },
  EMAIL_NOT_VERIFIED_PUBLISH: {
    status: 403,
    message: 'Confirm your email to publish announcements.',
  },
  ACTIVE_LIMIT_REACHED: {
    status: 409,
    message:
      'You already have 10 active announcements. Close the ones you no longer need.',
  },
  ADDRESS_NOT_FOUND: {
    status: 422,
    message: 'Address not found. Please pick the place on the map.',
  },
  GEOCODER_UNAVAILABLE: {
    status: 503,
    message:
      'Address search is temporarily unavailable. Please pick the place on the map.',
  },
  PHOTO_INVALID: {
    status: 400,
    message: 'Use JPEG, PNG or WebP files up to 10 MB.',
  },
  PHOTO_LIMIT: { status: 409, message: 'You can attach up to 5 photos.' },
  PHOTO_NOT_FOUND: { status: 404, message: 'The photo was not found.' },
  NOT_AUTHOR: {
    status: 403,
    message: 'You do not have permission to change this announcement.',
  },
  ANNOUNCEMENT_UNAVAILABLE: {
    status: 404,
    message: 'This announcement is no longer available.',
  },
  EDIT_IN_PROGRESS: {
    status: 409,
    message: 'You cannot edit an announcement while help is in progress.',
  },
  NOT_EDITABLE: {
    status: 409,
    message: 'Only active announcements can be edited.',
  },
  CLOSE_NOT_ALLOWED: {
    status: 409,
    message: 'Only active announcements can be closed.',
  },
  DELETE_IN_PROGRESS: {
    status: 409,
    message: 'You cannot delete an announcement while help is in progress.',
  },
  DELETE_NOT_ALLOWED: {
    status: 409,
    message: 'This announcement cannot be deleted in its current status.',
  },
  EXTEND_NOT_ALLOWED: {
    status: 409,
    message: 'Only active announcements can be extended.',
  },
  REPUBLISH_NOT_ALLOWED: {
    status: 409,
    message: 'Only a closed announcement can be published again.',
  },
  REPUBLISH_EXPIRED: {
    status: 409,
    message:
      'The 30-day period for publishing this announcement again has ended.',
  },
  FILE_LINK_INVALID: {
    status: 403,
    message: 'This link is invalid or has expired.',
  },
} as const;

export type ErrorCode = keyof typeof ERR;

export interface FieldError {
  code: string;
  message: string;
}

/** Error with a stable machine readable `code` (used by the web client for translation). */
export class AppException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    extra: Record<string, unknown> = {},
    message?: string,
  ) {
    super(
      {
        statusCode: ERR[code].status,
        code,
        message: message ?? ERR[code].message,
        ...extra,
      },
      ERR[code].status,
    );
  }
}

export function validationFailed(
  fields: Record<string, FieldError>,
): AppException {
  return new AppException('VALIDATION_FAILED', { fields });
}
