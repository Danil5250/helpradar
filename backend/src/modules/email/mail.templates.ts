import { OutgoingMail } from './mail.types';

export type MailLocale = 'uk' | 'en';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function html(
  title: string,
  paragraphs: string[],
  button: { label: string; url: string },
): string {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px">${escapeHtml(p)}</p>`)
    .join('');
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#EAE6D7;font-family:Arial,Helvetica,sans-serif;color:#1A2421">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
<h1 style="margin:0 0 16px;font-size:22px;color:#4A5D23">${escapeHtml(title)}</h1>${body}
<p style="margin:24px 0"><a href="${escapeHtml(button.url)}" style="background:#4A5D23;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">${escapeHtml(button.label)}</a></p>
<p style="margin:0;font-size:13px;color:#5B7065;word-break:break-all">${escapeHtml(button.url)}</p>
</div></body></html>`;
}

/** SRS 3.2.1.4: e-mail with the activation link (valid for 24 hours). */
export function activationEmail(
  locale: MailLocale,
  firstName: string,
  url: string,
): Pick<OutgoingMail, 'subject' | 'text' | 'html'> {
  if (locale === 'en') {
    const lines = [
      `Hello, ${firstName}!`,
      'Thank you for registering on HelpRadar. To activate your account, open the link below. It is valid for 24 hours.',
      'If you did not create this account, simply ignore this e-mail.',
    ];
    return {
      subject: 'Activate your HelpRadar account',
      text: `${lines[0]}\n\n${lines[1]}\n${url}\n\n${lines[2]}`,
      html: html('Activate your account', lines, {
        label: 'Activate account',
        url,
      }),
    };
  }
  const lines = [
    `Вітаємо, ${firstName}!`,
    'Дякуємо за реєстрацію на HelpRadar. Щоб активувати акаунт, відкрийте посилання нижче. Воно дійсне 24 години.',
    'Якщо ви не створювали акаунт, просто проігноруйте цей лист.',
  ];
  return {
    subject: 'Активація акаунта HelpRadar',
    text: `${lines[0]}\n\n${lines[1]}\n${url}\n\n${lines[2]}`,
    html: html('Активація акаунта', lines, { label: 'Активувати акаунт', url }),
  };
}

/** SRS 3.2.5.3 step 5: reminder 24 hours before the announcement expires, with an "Extend" action. */
export function expiryReminderEmail(
  locale: MailLocale,
  firstName: string,
  title: string,
  url: string,
): Pick<OutgoingMail, 'subject' | 'text' | 'html'> {
  if (locale === 'en') {
    const lines = [
      `Hello, ${firstName}!`,
      `Your announcement "${title}" expires in 24 hours. If you still need help, extend it by up to 14 days.`,
    ];
    return {
      subject: `Your announcement "${title}" expires in 24 hours`,
      text: `${lines[0]}\n\n${lines[1]}\n${url}`,
      html: html('Your announcement expires soon', lines, {
        label: 'Extend',
        url,
      }),
    };
  }
  const lines = [
    `Вітаємо, ${firstName}!`,
    `Ваше оголошення «${title}» спливає через 24 години. Якщо допомога ще потрібна, продовжте його до 14 днів.`,
  ];
  return {
    subject: `Ваше оголошення «${title}» спливає через 24 години`,
    text: `${lines[0]}\n\n${lines[1]}\n${url}`,
    html: html('Оголошення скоро спливе', lines, { label: 'Продовжити', url }),
  };
}
