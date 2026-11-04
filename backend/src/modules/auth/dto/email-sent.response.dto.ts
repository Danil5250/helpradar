export class EmailSentResponseDto {
  /** CHECK_EMAIL: "Check your email – we have sent you an activation link."; EMAIL_QUEUED: delivery is delayed. */
  code: 'CHECK_EMAIL' | 'EMAIL_QUEUED';
  message: string;
  emailQueued: boolean;
}
