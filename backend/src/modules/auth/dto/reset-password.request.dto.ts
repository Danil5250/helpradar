import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { MatchesField, PASSWORD_REGEX, v } from '../../../common/validation';

const LINK = v(
  'RESET_LINK_INVALID',
  'This link is invalid or has expired. Request a new one.',
);
const WEAK = v(
  'PASSWORD_WEAK',
  'The password must have 8–64 characters, including letters and digits.',
);

/** SRS 3.2.3.2 Inputs: token from the link, the new password and its confirmation. */
export class ResetPasswordRequestDto {
  @ApiProperty({ description: 'Token from the recovery link' })
  @IsString(LINK)
  @IsNotEmpty(LINK)
  @MaxLength(200, LINK)
  token: string;

  @ApiProperty({
    example: 'NewSecret123',
    minLength: 8,
    maxLength: 64,
    description: 'At least one letter and one digit',
  })
  @IsString(WEAK)
  @Matches(PASSWORD_REGEX, WEAK)
  password: string;

  @ApiProperty({ example: 'NewSecret123' })
  @IsString(v('PASSWORDS_MISMATCH', 'Passwords do not match.'))
  @MatchesField('password', v('PASSWORDS_MISMATCH', 'Passwords do not match.'))
  passwordConfirm: string;
}
