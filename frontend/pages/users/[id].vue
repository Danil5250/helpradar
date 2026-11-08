<template>
  <div class="px-4 mt-[2vh] max-w-screen-lg mx-auto">
    <LoadingSpinner v-if="loading" />

    <div v-else-if="problem" class="text-center my-16" role="alert">
      <p class="inline-block border-l-4 border-radar bg-almost-white rounded-r-lg px-4 py-3 mb-6" data-test="public-problem">{{ problem.text }}</p>
      <div>
        <AppButton v-if="problem.retry" is-filled class="mr-3" @click="load">{{ t('try_again') }}</AppButton>
        <NuxtLink to="/main"
          ><AppButton has-outline>{{ t('back_to_list') }}</AppButton></NuxtLink
        >
      </div>
    </div>

    <template v-else-if="user">
      <div class="bg-almost-white rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6">
        <img :src="user.avatarUrl" alt="" class="w-32 h-32 rounded-full object-cover border-4 border-sand" />
        <div class="flex flex-col gap-2 items-center md:items-start text-center md:text-left">
          <h1 class="font-kharkiv text-h4 xl:text-h3" data-test="public-name">{{ user.name }}</h1>
          <p class="text-sm">
            <span class="bg-sand rounded-full px-3 py-1">{{ t(user.role === 'volunteer' ? 'role_volunteer' : 'role_person_in_need') }}</span>
          </p>
          <p v-if="user.city" class="flex items-center gap-1 text-sm"><AppIcon name="pin" class="h-4 w-4 text-forest" />{{ user.city }}</p>
          <div v-if="user.rating !== null" class="flex items-center gap-2" data-test="public-rating">
            <ProfileRatingStars :value="user.rating" />
            <span class="text-sm text-sage">({{ t('reviews_count', { count: user.reviewsCount }) }})</span>
          </div>
          <p class="text-xs text-sage">{{ t('member_since', { date: formatDate(user.registeredAt, locale) }) }}</p>
        </div>
      </div>

      <div v-if="user.role === 'volunteer'" class="bg-almost-white rounded-3xl p-6 mt-8">
        <ProfileReviewsList :user-id="user.id" @updated="load" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// Imports
import type { PublicProfile } from '~/types/profile';

// Composables
const profileApi = useProfile();

// Data
const user = ref<PublicProfile | null>(null);
const loading = ref(true);
const problem = ref<{ text: string; retry: boolean } | null>(null);

// Utils
const { t, locale } = useI18n();
const route = useRoute();
const errorText = useApiErrorText();
useHead({ title: computed(() => (user.value ? `${user.value.name} - HelpRadar` : t('helmet_public_profile'))) });

// Methods
async function load() {
  loading.value = true;
  problem.value = null;
  try {
    user.value = await profileApi.publicProfile(String(route.params.id));
  } catch (error) {
    const apiError = toApiError(error);
    problem.value = {
      text: errorText(apiError, 'errors.PROFILE_UNAVAILABLE'),
      retry: apiError.code !== 'USER_NOT_FOUND' && apiError.code !== 'PROFILE_BLOCKED',
    };
  } finally {
    loading.value = false;
  }
}

// Lifecycle
onMounted(load);
</script>
