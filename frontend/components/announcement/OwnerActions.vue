<template>
  <div class="flex flex-wrap gap-3">
    <NuxtLink v-if="actions.includes('edit')" :to="`/main/announcement/${id}/edit`">
      <AppButton has-outline class="uppercase" data-test="action-edit">{{ t('edit') }}</AppButton>
    </NuxtLink>
    <AppButton v-if="actions.includes('extend')" is-filled class="uppercase" :loading="busy === 'extend'" data-test="action-extend" @click="run('extend')">{{ t('extend') }}</AppButton>
    <AppButton v-if="actions.includes('republish')" is-filled class="uppercase" :loading="busy === 'republish'" data-test="action-republish" @click="run('republish')">{{ t('republish') }}</AppButton>
    <AppButton v-if="actions.includes('close')" has-outline class="uppercase" :loading="busy === 'close'" data-test="action-close" @click="confirming = 'close'">{{ t('close_announcement') }}</AppButton>
    <AppButton v-if="actions.includes('delete')" has-outline class="uppercase" :loading="busy === 'delete'" data-test="action-delete" @click="confirming = 'delete'">
      <AppIcon name="trash" class="inline mr-1 h-4 w-4" />{{ t('delete') }}
    </AppButton>

    <ModalAsk
      :is-open="confirming !== null"
      :title="confirming === 'delete' ? t('delete_announcement') : t('close_announcement')"
      :message="confirming === 'delete' ? t('delete_announcement_confirm') : t('close_announcement_confirm')"
      @confirm="confirmed"
      @close="cancelled"
    />
  </div>
</template>

<script setup lang="ts">
// Imports
import type { AnnouncementAction, AnnouncementDetails } from '~/types/announcement';

// Props
const props = defineProps<{ id: number; actions: AnnouncementAction[] }>();

// Emits
const emit = defineEmits<{ updated: [announcement: AnnouncementDetails]; deleted: [] }>();

// Composables
const { sessionEnded } = useAuth();
const { show } = useFlash();
const announcements = useAnnouncements();

// Utils
const { t } = useI18n();
const route = useRoute();
const errorText = useApiErrorText();

// Data
const busy = ref<AnnouncementAction | null>(null);
const confirming = ref<'close' | 'delete' | null>(null);

// Methods
async function run(action: AnnouncementAction) {
  busy.value = action;
  try {
    if (action === 'extend') {
      const result = await announcements.extend(props.id);
      show(t('announcement_extended'));
      emit('updated', result.announcement);
    } else if (action === 'republish') {
      const result = await announcements.republish(props.id);
      show(t('announcement_published'));
      emit('updated', result.announcement);
    } else if (action === 'close') {
      const result = await announcements.close(props.id);
      show(t('announcement_closed'));
      emit('updated', result.announcement);
    } else if (action === 'delete') {
      await announcements.remove(props.id);
      show(t('announcement_deleted'));
      emit('deleted');
    }
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.status === 401) {
      sessionEnded();
      await navigateTo({ path: '/login', query: { redirect: route.fullPath } });
      return;
    }
    show(errorText(apiError, 'errors.SAVE_FAILED'), 'alert');
  } finally {
    busy.value = null;
  }
}

async function confirmed() {
  const action = confirming.value;
  confirming.value = null;
  if (action) await run(action);
}

function cancelled() {
  if (confirming.value === 'delete') show(t('action_cancelled'), 'info'); // SRS 3.2.5.5 "Deletion cancelled"
  confirming.value = null;
}
</script>
