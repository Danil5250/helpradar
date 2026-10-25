import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { v } from '../../../common/validation';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Token from the activation link' })
  @IsString(v('LINK_INVALID', 'This link is no longer valid.'))
  @IsNotEmpty(v('LINK_INVALID', 'This link is no longer valid.'))
  @MaxLength(200, v('LINK_INVALID', 'This link is no longer valid.'))
  token: string;
}
