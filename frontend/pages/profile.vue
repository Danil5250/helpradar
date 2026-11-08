<template>
  <div class="px-4 mt-[2vh]">
    <h1 class="font-kharkiv text-h3 xl:text-h2">{{ t('my_profile') }}</h1>

    <LoadingSpinner v-if="loading" />

    <div v-else-if="loadError" class="my-10 text-center" role="alert">
      <p class="inline-block mb-4 border-l-4 border-radar bg-almost-white rounded-r-lg px-3 py-2">{{ loadError }}</p>
      <div><AppButton has-outline @click="load">{{ t('try_again') }}</AppButton></div>
    </div>

    <div v-else-if="profile" class="flex flex-col xl:flex-row gap-8 mt-6">
      <aside class="xl:w-1/3 bg-almost-white rounded-3xl p-6 self-start w-full flex flex-col items-center text-center gap-2">
        <p class="font-montserratMedium text-xl mt-2" data-test="profile-name">{{ profile.firstName }} {{ profile.lastName }}</p>
        <p class="text-sm"><span class="bg-sand rounded-full px-3 py-1">{{ t(profile.role === 'volunteer' ? 'role_volunteer' : 'role_person_in_need') }}</span></p>
        <p v-if="profile.city" class="flex items-center gap-1 text-sm"><AppIcon name="pin" class="h-4 w-4 text-forest" />{{ profile.city }}</p>
        <p class="text-xs text-sage">{{ t('member_since', { date: formatDate(profile.createdAt, locale) }) }}</p>
        <NuxtLink :to="`/users/${profile.id}`" class="mt-2 underline font-montserratMedium hover:text-forest" data-test="public-link">{{ t('view_public_profile') }}</NuxtLink>
      </aside>

      <section class="xl:w-2/3 w-full flex flex-col gap-8">
        <div class="bg-almost-white rounded-3xl p-6">
          <div class="flex items-center justify-between gap-4 mb-4">
            <h2 class="font-kharkiv text-h5 xl:text-h4">{{ t('personal_data') }}</h2>
            <AppButton v-if="!editing" has-outline data-test="profile-edit" @click="editing = true">{{ t('editUPPER') }}</AppButton>
          </div>

          <p v-if="profile.pendingEmail" class="mb-4 border-l-4 border-sage bg-sand rounded-r-lg px-3 py-2" role="status" data-test="pending-email">
            {{ t('pending_email', { email: profile.pendingEmail }) }}
          </p>

          <ProfileForm v-if="editing" :profile="profile" @saved="saved" @cancel="editing = false" />

          <dl v-else class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4" data-test="profile-view">
            <div><dt class="text-sm text-sage">{{ t('name') }}</dt><dd class="font-montserratMedium">{{ profile.firstName }}</dd></div>
            <div><dt class="text-sm text-sage">{{ t('surname') }}</dt><dd class="font-montserratMedium">{{ profile.lastName }}</dd></div>
            <div><dt class="text-sm text-sage">{{ t('email') }}</dt><dd class="font-montserratMedium break-all">{{ profile.email }}</dd></div>
            <div><dt class="text-sm text-sage">{{ t('telephone_number') }}</dt><dd class="font-montserratMedium">{{ profile.phoneNumber || '—' }}</dd></div>
            <div><dt class="text-sm text-sage">{{ t('city_of_living') }}</dt><dd class="font-montserratMedium">{{ profile.city || '—' }}<span v-if="profile.region" class="text-sage text-sm"> ({{ profile.region }})</span></dd></div>
            <div v-if="profile.role === 'person_in_need'"><dt class="text-sm text-sage">{{ t('street') }}</dt><dd class="font-montserratMedium">{{ profile.street || '—' }}</dd></div>
            <div v-if="profile.role === 'volunteer'" class="md:col-span-2">
              <dt class="text-sm text-sage">{{ t('help_types') }}</dt>
              <dd class="flex flex-wrap gap-2 mt-1">
                <span v-for="type in profile.supports" :key="type" class="bg-sand rounded-full px-3 py-1 text-sm font-montserratMedium">{{ t(`support.${type}`) }}</span>
                <span v-if="profile.supports.length === 0">—</span>
              </dd>
            </div>
            <div class="md:col-span-2"><dt class="text-sm text-sage">{{ t('about_me') }}</dt><dd class="whitespace-pre-line break-words">{{ profile.aboutMe || '—' }}</dd></div>
          </dl>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
// Imports
import type { Profile, ProfileUpdated } from '~/types/profile';

// Composables
const profileApi = useProfile();
const { fetchMe, sessionEnded } = useAuth();
const { show } = useFlash();

// Utils
const { t, locale } = useI18n();
const errorText = useApiErrorText();
definePageMeta({ middleware: 'auth' });
useHead({ title: computed(() => t('helmet_profile')) });

// Data
const profile = ref<Profile | null>(null);
const loading = ref(true);
const loadError = ref('');
const editing = ref(false);

// Methods
async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    profile.value = await profileApi.get();
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.status === 401) {
      sessionEnded();
      await navigateTo('/login');
      return;
    }
    loadError.value = errorText(apiError, 'errors.PROFILE_UNAVAILABLE');
  } finally {
    loading.value = false;
  }
}

async function saved(result: ProfileUpdated) {
  profile.value = result.profile;
  editing.value = false;
  if (!result.emailChange) show(t('profile_updated'));
  else show(t(result.emailChange.emailQueued ? 'profile_updated_email_queued' : 'profile_updated_email_sent'));
  await fetchMe();
}

// Lifecycle
onMounted(load);
</script>
