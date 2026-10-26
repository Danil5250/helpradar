<template>
  <div class="mx-[2vw]">
    <LoadingSpinner v-if="loading" />
    <div v-else-if="loadError" class="text-center my-10" role="alert">{{ loadError }}</div>
    <div v-else-if="!canPublish" class="text-center my-10 border-l-4 border-radar bg-almost-white rounded-r-lg px-3 py-2 max-w-xl mx-auto" role="alert" data-test="role-not-allowed">
      {{ t('errors.ROLE_NOT_ALLOWED') }}
    </div>
    <AnnouncementForm v-else mode="create" :categories="categories" />
  </div>
</template>

<script setup lang="ts">
// Imports
import type { Category } from '~/types/announcement';

// Composables
const { canPublish } = useAuth();
const announcements = useAnnouncements();

// Utils
const { t } = useI18n();
const errorText = useApiErrorText();
definePageMeta({ middleware: 'auth' });
useHead({ title: computed(() => t('helmet_create')) });

// Data
const categories = ref<Category[]>([]);
const loading = ref(true);
const loadError = ref('');

// Lifecycle
onMounted(async () => {
  try {
    categories.value = await announcements.categories();
  } catch (error) {
    loadError.value = errorText(toApiError(error), 'errors.SERVER_ERROR');
  } finally {
    loading.value = false;
  }
});
</script>
