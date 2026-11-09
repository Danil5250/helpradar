import { createTransport } from 'nodemailer';
import { loadAppConfig } from '../../config/app.config';
import {
  createMailDriver,
  GmailMailDriver,
  LogMailDriver,
  MemoryMailDriver,
  SmtpMailDriver,
} from './mail.drivers';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
// Isolate the strategy from Nest's ESM runtime and local environment files.
jest.mock('@nestjs/common', () => ({ Logger: jest.fn() }));
jest.mock('@nestjs/config', () => ({
  registerAs: (_name: string, factory: () => unknown) => factory,
}));
jest.mock('../../config/env', () => ({}));

describe('Gmail mail strategy', () => {
  const sendMail = jest.fn();
  const config = () =>
    loadAppConfig({
      MAIL_DRIVER: 'gmail',
      EMAIL_USER: ' sender@gmail.com ',
      EMAIL_PASSWORD: 'abcd efgh ijkl mnop',
      SMTP_USER: 'unrelated@example.com',
      SMTP_PASSWORD: 'unrelated-password',
      EMAIL_SERVICE: 'outlook',
    }).mail;

  beforeEach(() => {
    jest.clearAllMocks();
    sendMail.mockReset().mockResolvedValue({});
    (createTransport as jest.Mock).mockReturnValue({ sendMail });
  });

  it('selects Gmail and sends the complete message with Gmail credentials', async () => {
    const driver = createMailDriver(config());
    expect(driver).toBeInstanceOf(GmailMailDriver);
    expect(createTransport).toHaveBeenCalledWith({
      service: 'gmail',
      auth: { user: 'sender@gmail.com', pass: 'abcdefghijklmnop' },
    });
    const mail = {
      to: 'recipient@example.com',
      subject: 'Confirm your account',
      text: 'Open the activation link',
      html: '<p>Open the activation link</p>',
    };
    await driver.send(mail);
    expect(sendMail).toHaveBeenCalledWith({
      from: 'HelpRadar Team <sender@gmail.com>',
      ...mail,
    });
  });

  it.each(['EMAIL_USER', 'EMAIL_PASSWORD'])(
    'rejects missing %s without falling back to SMTP credentials',
    (key) => {
      const env = {
        MAIL_DRIVER: 'gmail',
        EMAIL_USER: 'sender@gmail.com',
        EMAIL_PASSWORD: 'abcdefghijklmnop',
        SMTP_USER: 'unrelated@example.com',
        SMTP_PASSWORD: 'unrelated-password',
        [key]: ' ',
      };
      expect(() => createMailDriver(loadAppConfig(env).mail)).toThrow(
        'MAIL_DRIVER=gmail requires EMAIL_USER and EMAIL_PASSWORD',
      );
      expect(createTransport).not.toHaveBeenCalled();
    },
  );

  it('propagates send failures so the outbox can retry', async () => {
    sendMail.mockRejectedValueOnce(new Error('SMTP unavailable'));
    await expect(
      createMailDriver(config()).send({
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test',
      }),
    ).rejects.toThrow('SMTP unavailable');
  });

  it('preserves existing strategies and rejects invalid configuration', () => {
    expect(createMailDriver(loadAppConfig({}).mail)).toBeInstanceOf(
      LogMailDriver,
    );
    expect(
      createMailDriver(loadAppConfig({ MAIL_DRIVER: 'memory' }).mail),
    ).toBeInstanceOf(MemoryMailDriver);
    expect(
      createMailDriver(
        loadAppConfig({ MAIL_DRIVER: 'smtp', SMTP_HOST: 'localhost' }).mail,
      ),
    ).toBeInstanceOf(SmtpMailDriver);
    expect(() => loadAppConfig({ MAIL_DRIVER: 'invalid' })).toThrow(
      'MAIL_DRIVER must be one of:',
    );
  });
});
