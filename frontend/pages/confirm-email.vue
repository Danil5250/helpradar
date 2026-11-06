<template>
  <div class="radar-grid min-h-screen flex items-center justify-center px-4 py-10">
    <div class="bg-sand rounded-3xl p-8 md:p-12 w-full max-w-xl text-center">
      <NuxtLink to="/main" class="inline-block mb-6" :aria-label="t('main')"><HelpRadarLogo class="!h-10" /></NuxtLink>

      <LoadingSpinner v-if="state === 'loading'" />

      <template v-else>
        <h1 class="font-kharkiv text-h3 mb-4" :data-test="state === 'done' ? 'email-changed' : 'link-invalid'">{{ message }}</h1>
        <NuxtLink :to="isAuthenticated ? '/profile' : '/login'" class="inline-block mt-6 font-bold underline hover:text-forest">
          {{ isAuthenticated ? t('my_profile') : t('log_in') }}
        </NuxtLink>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
// Composables
const profileApi = useProfile();
const { isAuthenticated, fetchMe } = useAuth();

// Utils
const { t } = useI18n();
const route = useRoute();
const errorText = useApiErrorText();
definePageMeta({ layout: 'auth' });
useHead({ title: computed(() => t('helmet_confirm_email')) });

// Data
const state = ref<'loading' | 'done' | 'failed'>('loading');
const message = ref('');

// Lifecycle
onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : '';
  if (!token) {
    state.value = 'failed';
    message.value = t('errors.LINK_INVALID');
    return;
  }
  try {
    await profileApi.confirmEmail(token);
    state.value = 'done';
    message.value = t('email_changed');
    if (isAuthenticated.value) await fetchMe();
  } catch (error) {
    state.value = 'failed';
    message.value = errorText(toApiError(error), 'errors.LINK_INVALID');
  }
});
</script>
