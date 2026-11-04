import { UserResponseDto } from '../../users/dto/user.response.dto';

/** `user` is null for a guest (the web client asks on every start, so a guest must not get an error). */
export class CurrentUserResponseDto {
  user: UserResponseDto | null;
}
