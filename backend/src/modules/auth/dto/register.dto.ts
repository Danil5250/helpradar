import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  Equals,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  registerDecorator,
  ValidationArguments,
} from 'class-validator';
import {
  NAME_REGEX,
  PASSWORD_REGEX,
  PHONE_REGEX,
  v,
} from '../../../common/validation';
import { Role } from '../../users/enums/role.enum';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Validates that the property equals another property of the same object (e.g. "Repeat password"). */
function MatchesField(
  field: string,
  options: { message: string; context: { code: string } },
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'matchesField',
      target: object.constructor,
      propertyName,
      constraints: [field],
      options,
      validator: {
        validate: (value: unknown, args: ValidationArguments) =>
          value ===
          (args.object as Record<string, unknown>)[args.constraints[0]],
      },
    });
  };
}

/** SRS 3.2.1.2 Inputs - registration with role selection. */
export class RegisterDto {
  @ApiProperty({ example: 'Olena', minLength: 2, maxLength: 50 })
  @Transform(trim)
  @IsString(
    v(
      'FIRST_NAME_INVALID',
      'Enter your first name (2–50 letters, spaces, hyphens or apostrophes).',
    ),
  )
  @Matches(
    NAME_REGEX,
    v(
      'FIRST_NAME_INVALID',
      'Enter your first name (2–50 letters, spaces, hyphens or apostrophes).',
    ),
  )
  firstName: string;

  @ApiProperty({ example: "O'Connor-Shevchenko", minLength: 2, maxLength: 50 })
  @Transform(trim)
  @IsString(
    v(
      'LAST_NAME_INVALID',
      'Enter your last name (2–50 letters, spaces, hyphens or apostrophes).',
    ),
  )
  @Matches(
    NAME_REGEX,
    v(
      'LAST_NAME_INVALID',
      'Enter your last name (2–50 letters, spaces, hyphens or apostrophes).',
    ),
  )
  lastName: string;

  @ApiProperty({ example: 'olena@example.com', maxLength: 254 })
  @Transform(trim)
  @IsString(v('EMAIL_INVALID', 'Enter a valid email address.'))
  @MaxLength(254, v('EMAIL_INVALID', 'Enter a valid email address.'))
  @IsEmail({}, v('EMAIL_INVALID', 'Enter a valid email address.'))
  email: string;

  @ApiProperty({
    example: 'Secret123',
    minLength: 8,
    maxLength: 64,
    description: 'At least one letter and one digit',
  })
  @IsString(
    v(
      'PASSWORD_WEAK',
      'The password must have 8–64 characters, including letters and digits.',
    ),
  )
  @Matches(
    PASSWORD_REGEX,
    v(
      'PASSWORD_WEAK',
      'The password must have 8–64 characters, including letters and digits.',
    ),
  )
  password: string;

  @ApiProperty({ example: 'Secret123' })
  @IsString(v('PASSWORDS_MISMATCH', 'Passwords do not match.'))
  @MatchesField('password', v('PASSWORDS_MISMATCH', 'Passwords do not match.'))
  passwordConfirm: string;

  @ApiProperty({ enum: [Role.Volunteer, Role.PersonInNeed] })
  @IsIn(
    [Role.Volunteer, Role.PersonInNeed],
    v('ROLE_REQUIRED', 'Please choose your role: Volunteer or Person in Need.'),
  )
  role: Role.Volunteer | Role.PersonInNeed;

  @ApiProperty({
    example: 'Lviv',
    description: 'City selected from the autocomplete list',
  })
  @Transform(trim)
  @IsString(v('CITY_REQUIRED', 'Select your city from the list.'))
  @Length(2, 100, v('CITY_REQUIRED', 'Select your city from the list.'))
  city: string;

  @ApiPropertyOptional({ example: 'Lviv Oblast' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({
    example: '+380501234567',
    description: 'International format',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === ''
      ? undefined
      : trim({ value }),
  )
  @Matches(
    PHONE_REGEX,
    v(
      'PHONE_INVALID',
      'Enter the phone number in international format, e.g. +380XXXXXXXXX.',
    ),
  )
  phoneNumber?: string;

  @ApiProperty({
    example: true,
    description: 'Consent to the Terms of Use and Privacy Policy',
  })
  @Equals(
    true,
    v(
      'CONSENT_REQUIRED',
      'You must accept the Terms of Use and Privacy Policy.',
    ),
  )
  termsAccepted: boolean;

  @ApiProperty({ example: true, description: 'Confirmation of age 18+' })
  @Equals(
    true,
    v('AGE_NOT_CONFIRMED', 'Please confirm that you are 18 or older.'),
  )
  ageConfirmed: boolean;

  @ApiPropertyOptional({
    enum: ['uk', 'en'],
    description: 'Language of the activation e-mail',
  })
  @IsOptional()
  @IsIn(['uk', 'en'])
  locale?: 'uk' | 'en';
}
