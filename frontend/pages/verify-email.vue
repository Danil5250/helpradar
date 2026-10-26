<template>
  <div class="radar-grid min-h-screen flex items-center justify-center px-4 py-10">
    <div class="bg-sand rounded-3xl p-8 md:p-12 w-full max-w-xl text-center">
      <NuxtLink to="/main" class="inline-block mb-6" :aria-label="t('main')"><HelpRadarLogo class="!h-10" /></NuxtLink>

      <LoadingSpinner v-if="state === 'loading'" />

      <template v-else>
        <h1 class="font-kharkiv text-h3 mb-4" data-test="link-invalid">{{ errorMessage }}</h1>
        <form class="flex flex-col gap-3 mt-6 text-left" novalidate @submit.prevent="resend">
          <label for="resend-email" class="font-montserratRegular">{{ t('email') }}</label>
          <input id="resend-email" v-model="resendEmail" type="email" autocomplete="email" :placeholder="t('email_address')" class="w-full p-3 border-2 rounded-lg outline-none bg-almost-white border-sage focus:border-forest" />
          <AppButton type="submit" is-filled :loading="resendBusy" class="w-full text-charcoal py-3 rounded-full" data-test="resend">{{ t('resend_emailUPPER') }}</AppButton>
          <p v-if="resendInfo" class="text-charcoal border-l-4 border-sage bg-almost-white rounded-r-lg px-3 py-2" role="status">{{ resendInfo }}</p>
        </form>
        <NuxtLink to="/login" class="inline-block mt-6 font-bold underline hover:text-forest">{{ t('log_in') }}</NuxtLink>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
// Composables
const { verifyEmail } = useAuth();
const { show } = useFlash();

// Utils
const { t, locale } = useI18n();
const route = useRoute();
const errorText = useApiErrorText();
definePageMeta({ layout: 'auth' });
useHead({ title: computed(() => t('helmet_verify')) });

// Data
const state = ref<'loading' | 'failed'>('loading');
const errorMessage = ref('');
const resendEmail = ref('');
const resendInfo = ref('');
const resendBusy = ref(false);

// Methods
async function resend() {
  resendInfo.value = '';
  if (!resendEmail.value.trim()) return;
  resendBusy.value = true;
  try {
    const result = await apiFetch<{ code: string }>('/auth/resend-verification', {
      method: 'POST',
      body: { email: resendEmail.value.trim(), locale: locale.value },
    });
    resendInfo.value = t(result.code === 'EMAIL_QUEUED' ? 'errors.EMAIL_QUEUED' : 'check_email');
  } catch (error) {
    resendInfo.value = errorText(toApiError(error), 'errors.EMAIL_SERVICE_ERROR');
  } finally {
    resendBusy.value = false;
  }
}

// Lifecycle
onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : '';
  if (!token) {
    state.value = 'failed';
    errorMessage.value = t('errors.LINK_INVALID');
    return;
  }
  try {
    const result = await verifyEmail(token);
    show(t('account_activated', { name: result.user.firstName }));
    await navigateTo('/main', { replace: true });
  } catch (error) {
    state.value = 'failed';
    errorMessage.value = errorText(toApiError(error), 'errors.LINK_INVALID');
  }
});
</script>
