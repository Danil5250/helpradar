<template>
  <div class="px-4">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-[2vh]">
      <div>
        <h1 class="font-kharkiv text-h3 xl:text-h2">{{ t('my_announcements') }}</h1>
        <p class="text-sm text-sage mt-1" data-test="active-count">{{ t('active_count', { count: activeCount, max: 10 }) }}</p>
      </div>
      <NuxtLink v-if="canPublish" to="/add-announcement">
        <AppButton is-filled class="px-4"><AppIcon name="plus" class="inline mr-1" />{{ role === 'volunteer' ? t('offer_help') : t('create_request') }}</AppButton>
      </NuxtLink>
    </div>

    <LoadingSpinner v-if="loading" />

    <div v-else-if="loadError" class="my-10 text-center" role="alert">
      <p class="inline-block mb-4 border-l-4 border-radar bg-almost-white rounded-r-lg px-3 py-2">{{ loadError }}</p>
      <div><AppButton has-outline @click="load">{{ t('try_again') }}</AppButton></div>
    </div>

    <div v-else-if="items.length === 0" class="flex flex-col items-center justify-center my-[8%] text-center" data-test="mine-empty">
      <img src="~/assets/images/NothingFound.png" alt="" class="xl:w-[20vw] sm:w-[50vw] md:w-[20vw] h-auto mb-4" />
      <p class="font-montserratMedium">{{ t('no_own_announcements') }}</p>
    </div>

    <div v-else class="grid sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8" data-test="mine-list">
      <div v-for="item in items" :key="item.id" class="flex flex-col gap-3">
        <AnnouncementCard :announcement="item" show-status />
        <p v-if="item.status === 'Active' && hoursLeft(item.expiresAt) <= 24" class="px-2"><span class="bg-radar text-charcoal font-bold rounded-full px-3 py-1 text-sm" data-test="expires-soon">{{ t('expires_soon') }}</span></p>
        <p v-if="item.status === 'Closed' && item.republishUntil" class="px-2 text-sm text-sage">{{ t('republish_until', { date: formatDate(item.republishUntil, locale) }) }}</p>
        <div class="px-2">
          <AnnouncementOwnerActions :id="item.id" :actions="item.allowedActions" @updated="updated" @deleted="load" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnnouncementDetails, OwnAnnouncementItem } from '~/types/announcement';

definePageMeta({ middleware: 'auth' });
const { t, locale } = useI18n();
const { canPublish, role, sessionEnded } = useAuth();
const announcements = useAnnouncements();
const errorText = useApiErrorText();
useHead({ title: computed(() => t('helmet_mine')) });

const items = ref<OwnAnnouncementItem[]>([]);
const loading = ref(true);
const loadError = ref('');

async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    items.value = await announcements.mine();
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.status === 401) {
      sessionEnded();
      await navigateTo('/login');
      return;
    }
    loadError.value = errorText(apiError, 'errors.LIST_UNAVAILABLE');
  } finally {
    loading.value = false;
  }
}
onMounted(load);

const activeCount = computed(() => items.value.filter((item) => item.status === 'Active').length);

function updated(_announcement: AnnouncementDetails) {
  void load();
}
</script>
