<template>
  <form class="flex flex-col w-full" novalidate @submit.prevent="handleLogin">
    <div class="flex w-full space-x-4 mb-4 xl:mt-10 sm:mt-2">
      <div class="w-full xl:mb-4 mb-2">
        <label for="login-email" class="font-montserratRegular xl:mb-2 mb-0 block">{{ t('email') }}</label>
        <input
          id="login-email"
          v-model="form.email"
          type="email"
          name="email"
          autocomplete="username"
          :placeholder="t('email_address')"
          class="w-full p-3 border-2 rounded-lg outline-none bg-almost-white border-sage focus:border-forest"
          :class="{ 'border-radar': errors.email }"
          :aria-invalid="!!errors.email"
          aria-describedby="login-error"
        />
        <p v-if="errors.email" class="text-charcoal text-sm mt-1 border-l-4 border-radar pl-2">{{ fieldText(errors.email) }}</p>
      </div>
    </div>
    <div class="w-full mb-6 relative">
      <label for="login-password" class="font-montserratRegular mb-2 block">{{ t('password') }}</label>
      <input
        id="login-password"
        v-model="form.password"
        :type="showPassword ? 'text' : 'password'"
        name="password"
        autocomplete="current-password"
        :placeholder="t('your_password')"
        class="w-full p-3 border-2 rounded-lg outline-none bg-almost-white border-sage focus:border-forest xl:pr-12"
        :class="{ 'border-radar': errors.password }"
        :aria-invalid="!!errors.password"
        aria-describedby="login-error"
      />
      <button
        type="button"
        class="absolute right-3 top-[2.9rem] text-charcoal hover:text-forest"
        :aria-label="showPassword ? t('hide_password') : t('show_password')"
        :aria-pressed="showPassword"
        @click="showPassword = !showPassword"
      >
        <AppIcon :name="showPassword ? 'eye-off' : 'eye'" />
      </button>
      <p v-if="errors.password" class="text-charcoal text-sm mt-1 border-l-4 border-radar pl-2">{{ fieldText(errors.password) }}</p>
    </div>
    <div id="login-error" role="alert" aria-live="assertive">
      <p v-if="generalError" class="text-charcoal text-center mb-5 border-l-4 border-radar bg-almost-white rounded-r-lg px-3 py-2" data-test="login-error">
        {{ generalError }}
      </p>
    </div>

    <div v-if="unverifiedEmail" class="mb-5 text-center">
      <AppButton has-outline :disabled="resendCooldown > 0" data-test="resend" @click="resendEmail">
        {{ t('resend_emailUPPER') }}<template v-if="resendCooldown > 0"> ({{ resendCooldown }})</template>
      </AppButton>
      <p v-if="resendMessage" class="mt-3 text-sm text-charcoal border-l-4 border-sage bg-almost-white rounded-r-lg px-3 py-2" role="status">{{ resendMessage }}</p>
    </div>

    <AppButton type="submit" is-filled :loading="loading" class="w-full text-charcoal py-3 rounded-full mb-5" data-test="login-submit">
      {{ t('log_inUPPER') }}
    </AppButton>

    <div class="flex w-full justify-center">
      <p class="font-montserratRegular">
        {{ t('do_not_have_an_account_yet') }}
        <NuxtLink to="/registration" class="text-charcoal font-bold underline hover:text-forest">{{ t('to_register') }}</NuxtLink>
      </p>
    </div>
  </form>
</template>

<script setup lang="ts">
import { validateLogin, type LoginForm } from '~/utils/validation';

const { t, locale } = useI18n();
const { login } = useAuth();
const { show } = useFlash();
const route = useRoute();
const errorText = useApiErrorText();
const fieldText = useFieldErrorText();

const form = reactive<LoginForm>({ email: '', password: '' });
const showPassword = ref(false);
const errors = ref<Partial<Record<keyof LoginForm, string>>>({});
const generalError = ref('');
const loading = ref(false);
const unverifiedEmail = ref('');
const resendMessage = ref('');
const resendCooldown = ref(0);
let cooldownTimer: ReturnType<typeof setInterval> | undefined;
function redirectTarget(): string {
  const target = route.query.redirect;
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/login')
    ? target
    : '/main';
}

async function handleLogin() {
  generalError.value = '';
  resendMessage.value = '';
  unverifiedEmail.value = '';
  errors.value = validateLogin(form);
  if (Object.keys(errors.value).length > 0) {
    generalError.value = t('errors.FIELDS_REQUIRED');
    return;
  }

  loading.value = true;
  try {
    const result = await login(form.email.trim(), form.password);
    show(t('welcome_back', { name: result.user.firstName }));
    await navigateTo(redirectTarget());
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.code === 'EMAIL_NOT_VERIFIED') unverifiedEmail.value = String(apiError.data.email ?? form.email.trim());
    if (apiError.code === 'VALIDATION_FAILED') {
      errors.value = { email: apiError.fields.email?.code, password: apiError.fields.password?.code };
      generalError.value = t('errors.FIELDS_REQUIRED');
    } else {
      generalError.value = errorText(apiError, 'errors.LOGIN_UNAVAILABLE');
    }
  } finally {
    loading.value = false;
  }
}

async function resendEmail() {
  resendMessage.value = '';
  try {
    const result = await apiFetch<{ code: string }>('/auth/resend-verification', {
      method: 'POST',
      body: { email: unverifiedEmail.value, locale: locale.value },
    });
    resendMessage.value = t(result.code === 'EMAIL_QUEUED' ? 'errors.EMAIL_QUEUED' : 'check_email');
    resendCooldown.value = 60;
    cooldownTimer = setInterval(() => {
      resendCooldown.value -= 1;
      if (resendCooldown.value <= 0 && cooldownTimer) clearInterval(cooldownTimer);
    }, 1000);
  } catch (error) {
    resendMessage.value = errorText(toApiError(error), 'errors.EMAIL_SERVICE_ERROR');
  }
}
onBeforeUnmount(() => cooldownTimer && clearInterval(cooldownTimer));
</script>
