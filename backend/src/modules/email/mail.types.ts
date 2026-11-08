export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Delivery strategy: console (development), SMTP, Gmail or in-memory (tests). */
export interface MailDriver {
  send(mail: OutgoingMail): Promise<void>;
}

export const MAIL_DRIVER = Symbol('MAIL_DRIVER');
