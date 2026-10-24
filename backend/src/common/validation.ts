import { ValidationError, ValidationPipe } from '@nestjs/common';
import { AppException, FieldError } from './errors';

/** Builds class-validator options carrying both the user facing text and a stable error code. */
export const v = (code: string, message: string) => ({
  message,
  context: { code },
});

function collect(
  errors: ValidationError[],
  prefix: string,
  into: Record<string, FieldError>,
): void {
  for (const error of errors) {
    const path = prefix ? `${prefix}.${error.property}` : error.property;
    if (error.constraints) {
      const [constraint, message] = Object.entries(error.constraints)[0];
      const context = error.contexts?.[constraint] as
        { code?: string } | undefined;
      into[path] = {
        code:
          context?.code ??
          (constraint === 'whitelistValidation' ? 'UNKNOWN_FIELD' : 'INVALID'),
        message,
      };
    }
    if (error.children?.length) collect(error.children, path, into);
  }
}

export function buildValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => {
      const fields: Record<string, FieldError> = {};
      collect(errors, '', fields);
      return new AppException('VALIDATION_FAILED', { fields });
    },
  });
}

/** Letters (any alphabet), spaces, hyphens and apostrophes; 2-50 characters; at least one letter. */
export const NAME_REGEX = /^(?=.*\p{L})[\p{L} '’ʼ-]{2,50}$/u;
/** 8-64 characters with at least one letter and one digit. */
export const PASSWORD_REGEX = /^(?=.*\p{L})(?=.*\d).{8,64}$/u;
/** International format, e.g. +380XXXXXXXXX (E.164). */
export const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
