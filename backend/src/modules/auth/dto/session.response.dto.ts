import { UserResponseDto } from '../../users/dto/user.response.dto';

/** The web client relies on the HttpOnly cookie; the token is also returned for API/mobile clients. */
export class SessionResponseDto {
  user: UserResponseDto;
  expiresAt: string;
  token: string;
}
