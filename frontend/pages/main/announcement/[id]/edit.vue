<template>
  <div class="mx-[2vw]">
    <LoadingSpinner v-if="loading" />
    <div v-else-if="problem" class="text-center my-10 max-w-xl mx-auto" role="alert">
      <p class="border-l-4 border-radar bg-almost-white rounded-r-lg px-3 py-2 mb-6" data-test="edit-problem">{{ problem }}</p>
      <NuxtLink :to="`/main/announcement/${route.params.id}`" class="font-bold underline hover:text-forest">{{ t('back_to_announcement') }}</NuxtLink>
    </div>
    <AnnouncementForm v-else mode="edit" :categories="categories" :initial="details" />
  </div>
</template>

<script setup lang="ts">
// Imports
import type { AnnouncementDetails, Category } from '~/types/announcement';

// Composables
const announcements = useAnnouncements();

// Utils
const { t } = useI18n();
const route = useRoute();
const errorText = useApiErrorText();
definePageMeta({ middleware: 'auth' });
useHead({ title: computed(() => t('helmet_edit')) });

// Data
const details = ref<AnnouncementDetails | null>(null);
const categories = ref<Category[]>([]);
const loading = ref(true);
const problem = ref('');

// Lifecycle
onMounted(async () => {
  try {
    [details.value, categories.value] = await Promise.all([announcements.get(String(route.params.id)), announcements.categories()]);
    if (!details.value.isOwner) problem.value = t('errors.NOT_AUTHOR');
    else if (details.value.status === 'InProgress') problem.value = t('errors.EDIT_IN_PROGRESS');
    else if (!details.value.allowedActions.includes('edit')) problem.value = t('errors.NOT_EDITABLE');
  } catch (error) {
    problem.value = errorText(toApiError(error), 'errors.DETAILS_UNAVAILABLE');
  } finally {
    loading.value = false;
  }
});
</script>
