import { Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { AppConfig } from '../../config/app.config';
import { MailDriver, OutgoingMail } from './mail.types';

/** Development driver: prints the e-mail (including the activation link) to the backend console. */
export class LogMailDriver implements MailDriver {
  private readonly logger = new Logger('Mail');

  async send(mail: OutgoingMail): Promise<void> {
    this.logger.log(
      `\n--- e-mail to ${mail.to} ---\nSubject: ${mail.subject}\n\n${mail.text}\n--- end of e-mail ---`,
    );
  }
}

/** Test driver: keeps the messages in memory so tests can read the activation links. */
export class MemoryMailDriver implements MailDriver {
  readonly sent: OutgoingMail[] = [];
  failNext = 0;

  async send(mail: OutgoingMail): Promise<void> {
    if (this.failNext > 0) {
      this.failNext -= 1;
      throw new Error('Simulated e-mail service outage');
    }
    this.sent.push(mail);
  }
}

export class SmtpMailDriver implements MailDriver {
  private readonly transporter: Transporter;

  constructor(private readonly config: AppConfig['mail']) {
    this.transporter = createTransport(
      config.service
        ? {
            service: config.service,
            auth: { user: config.user, pass: config.password },
          }
        : {
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: config.user
              ? { user: config.user, pass: config.password }
              : undefined,
          },
    );
  }

  async send(mail: OutgoingMail): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  }
}

/** Gmail strategy: authenticates with a Google app password over Gmail's secure SMTP. */
export class GmailMailDriver extends SmtpMailDriver {
  constructor(config: AppConfig['mail']) {
    if (!config.user?.trim() || !config.password?.trim()) {
      throw new Error(
        'MAIL_DRIVER=gmail requires EMAIL_USER and EMAIL_PASSWORD (Google app password).',
      );
    }
    super({
      ...config,
      service: 'gmail',
      user: config.user.trim(),
      password: config.password.replace(/\s/g, ''),
    });
  }
}

export function createMailDriver(config: AppConfig['mail']): MailDriver {
  switch (config.driver) {
    case 'memory':
      return new MemoryMailDriver();
    case 'gmail':
      return new GmailMailDriver(config);
    case 'smtp':
      if (!config.service && !config.host) {
        throw new Error(
          'MAIL_DRIVER=smtp requires EMAIL_SERVICE (e.g. gmail) or SMTP_HOST.',
        );
      }
      return new SmtpMailDriver(config);
    default:
      return new LogMailDriver();
  }
}
