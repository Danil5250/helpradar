<template>
  <div class="radar-grid min-h-screen flex items-center justify-center px-4 py-10">
    <div class="bg-sand rounded-3xl p-8 md:p-12 w-full max-w-xl">
      <NuxtLink to="/main" class="inline-block mb-6" :aria-label="t('main')"><HelpRadarLogo class="!h-10" /></NuxtLink>
      <h1 class="font-kharkiv text-h3 mb-2">{{ t('password_recovery') }}</h1>
      <p class="font-montserratRegular mb-6">{{ t('password_recovery_hint') }}</p>

      <form v-if="!sent" class="flex flex-col gap-3" novalidate data-test="forgot-form" @submit.prevent="submit">
        <label for="forgot-email" class="font-montserratRegular">{{ t('email') }}</label>
        <input
          id="forgot-email"
          v-model="email"
          type="email"
          autocomplete="email"
          :placeholder="t('email_address')"
          class="w-full p-3 border-2 rounded-lg outline-none bg-almost-white border-sage focus:border-forest"
          :class="{ 'border-radar': error }"
          :aria-invalid="!!error"
          aria-describedby="forgot-error"
          data-test="forgot-email"
        />
        <FieldError id="forgot-error" :text="error" />
        <AppButton type="submit" is-filled :loading="busy" class="w-full text-charcoal py-3 rounded-full mt-2" data-test="forgot-submit">{{ t('send_reset_linkUPPER') }}</AppButton>
      </form>

      <p v-else class="border-l-4 border-sage bg-almost-white rounded-r-lg px-3 py-2" role="status" data-test="forgot-sent">{{ t('reset_link_sent') }}</p>

      <NuxtLink to="/login" class="inline-block mt-6 font-bold underline hover:text-forest">{{ t('back_to_login') }}</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
// Imports
import { EMAIL_REGEX, LIMITS } from '~/utils/validation';

// Composables
const { forgotPassword } = useAuth();

// Utils
const { t, locale } = useI18n();
const fieldText = useFieldErrorText();
const errorText = useApiErrorText();
definePageMeta({ layout: 'auth' });
useHead({ title: computed(() => t('helmet_password_recovery')) });

// Data
const email = ref('');
const error = ref('');
const busy = ref(false);
const sent = ref(false);

// Methods
async function submit() {
  error.value = '';
  const value = email.value.trim();
  if (!EMAIL_REGEX.test(value) || value.length > LIMITS.emailMax) {
    error.value = fieldText('EMAIL_INVALID');
    return;
  }
  busy.value = true;
  try {
    await forgotPassword(value, locale.value);
    sent.value = true;
  } catch (failure) {
    error.value = errorText(toApiError(failure), 'errors.SERVER_ERROR');
  } finally {
    busy.value = false;
  }
}
</script>
