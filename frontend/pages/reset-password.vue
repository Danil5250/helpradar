<template>
  <div class="radar-grid min-h-screen flex items-center justify-center px-4 py-10">
    <div class="bg-sand rounded-3xl p-8 md:p-12 w-full max-w-xl">
      <NuxtLink to="/main" class="inline-block mb-6" :aria-label="t('main')"><HelpRadarLogo class="!h-10" /></NuxtLink>

      <LoadingSpinner v-if="state === 'checking'" />

      <template v-else-if="state === 'invalid'">
        <h1 class="font-kharkiv text-h3 mb-4" data-test="reset-invalid">{{ t('errors.RESET_LINK_INVALID') }}</h1>
        <NuxtLink to="/forgot-password"><AppButton is-filled>{{ t('request_new_linkUPPER') }}</AppButton></NuxtLink>
      </template>

      <template v-else>
        <h1 class="font-kharkiv text-h3 mb-6">{{ t('new_password') }}</h1>
        <form class="flex flex-col gap-4" novalidate data-test="reset-form" @submit.prevent="submit">
          <div class="relative">
            <label for="reset-password" class="font-montserratRegular mb-2 block">{{ t('new_password') }}*</label>
            <input
              id="reset-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              class="w-full p-3 pr-12 border-2 rounded-lg outline-none bg-almost-white border-sage focus:border-forest"
              :class="{ 'border-radar': errors.password }"
              :aria-invalid="!!errors.password"
              aria-describedby="reset-password-hint"
              data-test="reset-password"
            />
            <button type="button" class="absolute right-3 top-[2.9rem] text-charcoal hover:text-forest" :aria-label="showPassword ? t('hide_password') : t('show_password')" :aria-pressed="showPassword" @click="showPassword = !showPassword">
              <AppIcon :name="showPassword ? 'eye-off' : 'eye'" />
            </button>
            <p id="reset-password-hint" class="text-xs text-sage mt-1">{{ t('password_rules') }}</p>
            <FieldError :text="fieldText(errors.password)" />
          </div>
          <div>
            <label for="reset-password-confirm" class="font-montserratRegular mb-2 block">{{ t('repeat_password') }}*</label>
            <input
              id="reset-password-confirm"
              v-model="passwordConfirm"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              class="w-full p-3 border-2 rounded-lg outline-none bg-almost-white border-sage focus:border-forest"
              :class="{ 'border-radar': errors.passwordConfirm }"
              :aria-invalid="!!errors.passwordConfirm"
              data-test="reset-password-confirm"
            />
            <FieldError :text="fieldText(errors.passwordConfirm)" />
          </div>
          <p v-if="submitError" class="border-l-4 border-radar bg-almost-white rounded-r-lg px-3 py-2" role="alert">{{ submitError }}</p>
          <AppButton type="submit" is-filled :loading="busy" class="w-full text-charcoal py-3 rounded-full" data-test="reset-submit">{{ t('save_passwordUPPER') }}</AppButton>
        </form>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
// Imports
import { PASSWORD_REGEX } from '~/utils/validation';

// Composables
const { checkResetToken, resetPassword } = useAuth();
const { show } = useFlash();

// Utils
const { t } = useI18n();
const route = useRoute();
const fieldText = useFieldErrorText();
const errorText = useApiErrorText();
definePageMeta({ layout: 'auth' });
useHead({ title: computed(() => t('helmet_password_recovery')) });

// Data
const state = ref<'checking' | 'invalid' | 'ready'>('checking');
const password = ref('');
const passwordConfirm = ref('');
const showPassword = ref(false);
const errors = ref<{ password?: string; passwordConfirm?: string }>({});
const submitError = ref('');
const busy = ref(false);

// Computed
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''));

// Methods
async function submit() {
  submitError.value = '';
  errors.value = {};
  if (!PASSWORD_REGEX.test(password.value)) errors.value.password = 'PASSWORD_WEAK';
  if (passwordConfirm.value !== password.value) errors.value.passwordConfirm = 'PASSWORDS_MISMATCH';
  if (Object.keys(errors.value).length > 0) return;

  busy.value = true;
  try {
    await resetPassword(token.value, password.value, passwordConfirm.value);
    show(t('password_changed'));
    await navigateTo('/login', { replace: true });
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.code === 'RESET_LINK_INVALID') {
      state.value = 'invalid';
    } else if (apiError.code === 'VALIDATION_FAILED') {
      errors.value = { password: apiError.fields.password?.code, passwordConfirm: apiError.fields.passwordConfirm?.code };
      if (apiError.fields.token) state.value = 'invalid';
    } else {
      submitError.value = errorText(apiError, 'errors.SERVER_ERROR');
    }
  } finally {
    busy.value = false;
  }
}

// Lifecycle
onMounted(async () => {
  if (!token.value) {
    state.value = 'invalid';
    return;
  }
  try {
    await checkResetToken(token.value);
    state.value = 'ready';
  } catch {
    state.value = 'invalid';
  }
});
</script>
