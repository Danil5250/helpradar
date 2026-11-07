import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { v } from '../../../common/validation';

const LINK = v(
  'RESET_LINK_INVALID',
  'This link is invalid or has expired. Request a new one.',
);

/** SRS 3.2.3.3 step 4: the page checks the link before showing the new password form. */
export class CheckResetTokenRequestDto {
  @ApiProperty({ description: 'Token from the recovery link' })
  @IsString(LINK)
  @IsNotEmpty(LINK)
  @MaxLength(200, LINK)
  token: string;
}
