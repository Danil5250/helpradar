import { EmailSentResponseDto } from '../../auth/dto/email-sent.response.dto';
import { ProfileResponseDto } from './profile.response.dto';

export class ProfileUpdatedResponseDto {
  code: string;
  message: string;
  profile: ProfileResponseDto;
  /** Set when a new e-mail was requested: the confirmation link has been sent (or queued). */
  emailChange: EmailSentResponseDto | null;
}
