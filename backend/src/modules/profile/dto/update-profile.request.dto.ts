import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { NAME_REGEX, PHONE_REGEX, v } from '../../../common/validation';
import { SupportType } from '../../users/enums/support-type.enum';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const FIRST_NAME = v(
  'FIRST_NAME_INVALID',
  'Enter your first name (2–50 letters, spaces, hyphens or apostrophes).',
);
const LAST_NAME = v(
  'LAST_NAME_INVALID',
  'Enter your last name (2–50 letters, spaces, hyphens or apostrophes).',
);
const CITY = v('CITY_REQUIRED', 'Select your city from the list.');
const STREET = v('STREET_INVALID', 'Select the street from the list.');
const PHONE = v(
  'PHONE_INVALID',
  'Enter the phone number in international format, e.g. +380XXXXXXXXX.',
);
const ABOUT = v('ABOUT_TOO_LONG', '"About me" can be up to 500 characters.');
const SUPPORTS = v(
  'SUPPORTS_INVALID',
  'Choose the types of help from the list.',
);
const EMAIL = v('EMAIL_INVALID', 'Enter a valid email address.');

/** SRS 3.2.12.2 Inputs - editing the personal profile. Fields that are not sent stay unchanged. */
export class UpdateProfileRequestDto {
  @ApiPropertyOptional({ example: 'Olena', minLength: 2, maxLength: 50 })
  @IsOptional()
  @Transform(trim)
  @IsString(FIRST_NAME)
  @Matches(NAME_REGEX, FIRST_NAME)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Shevchenko', minLength: 2, maxLength: 50 })
  @IsOptional()
  @Transform(trim)
  @IsString(LAST_NAME)
  @Matches(NAME_REGEX, LAST_NAME)
  lastName?: string;

  @ApiPropertyOptional({
    example: 'Lviv',
    description: 'City selected from the autocomplete list',
  })
  @IsOptional()
  @Transform(trim)
  @IsString(CITY)
  @Length(2, 100, CITY)
  city?: string;

  @ApiPropertyOptional({ example: 'Lviv Oblast' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({
    example: 'Shevchenka St',
    description:
      'Persons in need only: street selected from the autocomplete list; an empty string clears it',
  })
  @IsOptional()
  @Transform(trim)
  @IsString(STREET)
  @MaxLength(255, STREET)
  street?: string;

  @ApiPropertyOptional({
    example: '+380501234567',
    nullable: true,
    description: 'International format; an empty string removes the number',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? null : trim({ value }),
  )
  @Matches(PHONE_REGEX, PHONE)
  phoneNumber?: string | null;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @Transform(trim)
  @IsString(ABOUT)
  @MaxLength(500, ABOUT)
  aboutMe?: string;

  @ApiPropertyOptional({
    enum: SupportType,
    isArray: true,
    description: 'Volunteers only: types of help they are ready to provide',
  })
  @IsOptional()
  @IsArray(SUPPORTS)
  @ArrayUnique(SUPPORTS)
  @IsEnum(SupportType, { each: true, ...SUPPORTS })
  supports?: SupportType[];

  @ApiPropertyOptional({
    example: 'new@example.com',
    description:
      'A new e-mail address; it becomes active only after it is confirmed by the link sent to it',
  })
  @IsOptional()
  @Transform(trim)
  @IsString(EMAIL)
  @MaxLength(254, EMAIL)
  @IsEmail({}, EMAIL)
  email?: string;

  @ApiPropertyOptional({
    enum: ['uk', 'en'],
    description: 'Language of the confirmation e-mail',
  })
  @IsOptional()
  @IsIn(['uk', 'en'])
  locale?: 'uk' | 'en';
}
