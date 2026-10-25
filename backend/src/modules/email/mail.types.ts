export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Transport used to deliver e-mails: console (development), nodemailer SMTP or in-memory (tests). */
export interface MailDriver {
  send(mail: OutgoingMail): Promise<void>;
}

export const MAIL_DRIVER = Symbol('MAIL_DRIVER');
