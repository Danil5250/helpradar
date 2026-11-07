import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { v } from '../../../common/validation';

/** SRS 3.2.3.2 Inputs: e-mail of the account whose password was forgotten. */
export class ForgotPasswordRequestDto {
  @ApiProperty({ example: 'olena@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString(v('EMAIL_INVALID', 'Enter a valid email address.'))
  @MaxLength(254, v('EMAIL_INVALID', 'Enter a valid email address.'))
  @IsEmail({}, v('EMAIL_INVALID', 'Enter a valid email address.'))
  email: string;

  @ApiPropertyOptional({
    enum: ['uk', 'en'],
    description: 'Language of the e-mail',
  })
  @IsOptional()
  @IsIn(['uk', 'en'])
  locale?: 'uk' | 'en';
}
