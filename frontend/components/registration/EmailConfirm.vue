<template>
  <div class="flex flex-col items-center justify-center p-8 w-full h-full">
    <h2 class="xl:text-relative-h3 sm:text-relative-h1 uppercase font-kharkiv mb-8 text-center" data-test="check-email-title">{{ message }}</h2>
    <h3 class="xl:text-h5 md:text-relative-h3 sm:text-relative-h2 whitespace-pre-line font-montserratRegular mb-8 text-center">
      {{ t('check_email_hint', { email }) }}
    </h3>
    <AppButton is-filled class="w-full text-charcoal py-4 rounded-full mb-4 xl:text-relative-pl md:text-relative-h3 sm:text-relative-h2" :disabled="cooldown > 0" data-test="resend" @click="handleResend">
      {{ t('resend_emailUPPER') }}<template v-if="cooldown > 0"> ({{ cooldown }})</template>
    </AppButton>
    <p v-if="info" class="mb-6 text-charcoal text-center border-l-4 border-sage bg-almost-white rounded-r-lg px-3 py-2" role="status">{{ info }}</p>
    <NuxtLink to="/login" class="w-full">
      <AppButton has-outline class="w-full text-charcoal py-4 rounded-full mb-8 xl:text-relative-pl md:text-relative-h3 sm:text-relative-h2">{{ t('log_inUPPER') }}</AppButton>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ email: string; queued: boolean }>();
const { t, locale } = useI18n();
const errorText = useApiErrorText();

const message = ref(props.queued ? t('errors.EMAIL_QUEUED') : t('check_email'));
const info = ref('');
const cooldown = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;

function startCooldown() {
  cooldown.value = 60;
  timer = setInterval(() => {
    cooldown.value -= 1;
    if (cooldown.value <= 0 && timer) clearInterval(timer);
  }, 1000);
}
onBeforeUnmount(() => timer && clearInterval(timer));
startCooldown();

async function handleResend() {
  info.value = '';
  try {
    const result = await apiFetch<{ code: string }>('/auth/resend-verification', {
      method: 'POST',
      body: { email: props.email, locale: locale.value },
    });
    info.value = t(result.code === 'EMAIL_QUEUED' ? 'errors.EMAIL_QUEUED' : 'check_email');
    startCooldown();
  } catch (error) {
    info.value = errorText(toApiError(error), 'errors.EMAIL_SERVICE_ERROR');
  }
}
</script>
