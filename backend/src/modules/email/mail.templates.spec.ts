import {
  activationEmail,
  emailChangeEmail,
  expiryReminderEmail,
  passwordResetEmail,
} from './mail.templates';

describe('Email templates', () => {
  it.each(['uk', 'en'] as const)(
    'renders escaped HTML and plain-text links in %s',
    (locale) => {
      const name = '<script>"Anna" & \'Test\'</script>';
      const url = 'https://app.test/confirm?token=test&locale=en';
      const messages = [
        activationEmail(locale, name, url),
        emailChangeEmail(locale, name, url),
        passwordResetEmail(locale, name, url),
        expiryReminderEmail(locale, name, '<b>Help</b>', url),
      ];
      for (const message of messages) {
        expect(message.text).toContain(url);
        expect(message.text).toContain(name);
        expect(message.html).not.toContain('<script>');
        expect(message.html).toContain(
          '&lt;script&gt;&quot;Anna&quot; &amp; &#39;Test&#39;&lt;/script&gt;',
        );
        expect(message.html).toContain('token=test&amp;locale=en');
        expect(message.subject.length).toBeGreaterThan(0);
      }
      expect(messages[3].html).toContain('&lt;b&gt;Help&lt;/b&gt;');
    },
  );
});
