export class UploadAvatarResponseDto {
  code: string;
  message: string;
  /** Temporary signed URL of the new 256×256 avatar. */
  avatarUrl: string;
}
