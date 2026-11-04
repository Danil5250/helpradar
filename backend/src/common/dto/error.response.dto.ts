import { FieldErrorResponseDto } from './field-error.response.dto';

/** Body of every error response (see AllExceptionsFilter). */
export class ErrorResponseDto {
  statusCode: number;
  /** Stable machine readable code; the web client translates the message by it. */
  code: string;
  message: string;
  /** VALIDATION_FAILED: errors by field path. */
  fields?: Record<string, FieldErrorResponseDto>;
  /** RATE_LIMITED, TOO_MANY_ATTEMPTS: seconds until the next attempt is allowed. */
  retryAfterSeconds?: number;
  /** EMAIL_NOT_VERIFIED: the address that still has to be confirmed. */
  email?: string;
  /** ACCOUNT_BLOCKED: end of the block and its reason. */
  blockedUntil?: string;
  reason?: string | null;
}
