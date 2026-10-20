import { createI18n } from 'vue-i18n';
import en from '~/locales/en.json';
import uk from '~/locales/uk.json';

export const LANGUAGE_KEY = 'hr_language';

export default defineNuxtPlugin((nuxtApp) => {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(LANGUAGE_KEY);
  } catch {
    saved = null;
  }

  const i18n = createI18n({
    legacy: false,
    locale: saved === 'en' ? 'en' : 'uk',
    fallbackLocale: 'en',
    messages: { uk, en },
    missingWarn: false,
    fallbackWarn: false,
  });
  nuxtApp.vueApp.use(i18n);

  return { provide: { i18n } };
});
