import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { v } from '../../../common/validation';

/** SRS 3.2.2.2 Inputs: e-mail and password; empty fields are reported with the SRS text. */
export class LoginDto {
  @ApiProperty({ example: 'olena@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString(v('FIELDS_REQUIRED', 'Enter your email and password.'))
  @IsNotEmpty(v('FIELDS_REQUIRED', 'Enter your email and password.'))
  email: string;

  @ApiProperty({ example: 'Secret123' })
  @IsString(v('FIELDS_REQUIRED', 'Enter your email and password.'))
  @IsNotEmpty(v('FIELDS_REQUIRED', 'Enter your email and password.'))
  password: string;
}
