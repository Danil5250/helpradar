<template>
  <div class="flex flex-col items-center">
    <div class="relative">
      <img :src="url" alt="" class="w-32 h-32 rounded-full object-cover border-4 border-sand" data-test="avatar" />
      <button
        type="button"
        class="absolute bottom-0 right-0 bg-forest text-almost-white rounded-full p-2 hover:brightness-110 disabled:opacity-60"
        :aria-label="t('change_avatar')"
        :disabled="busy"
        data-test="avatar-change"
        @click="input?.click()"
      >
        <span v-if="busy" class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
        <AppIcon v-else name="camera" />
      </button>
    </div>
    <input ref="input" type="file" :accept="PHOTO_TYPES.join(',')" class="hidden" data-test="avatar-input" @change="onSelect" />
    <p class="text-xs text-sage mt-2 text-center">{{ t('avatar_hint') }}</p>
    <FieldError :text="error" />
  </div>
</template>

<script setup lang="ts">
// Imports
import { PHOTO_TYPES, validateAvatar } from '~/utils/validation';

// Props
defineProps<{ url: string }>();

// Emits
const emit = defineEmits<{ uploaded: [url: string] }>();

// Composables
const profile = useProfile();

// Utils
const { t } = useI18n();
const fieldText = useFieldErrorText();
const errorText = useApiErrorText();

// Data
const input = ref<HTMLInputElement | null>(null);
const busy = ref(false);
const error = ref('');

// Methods
async function onSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  error.value = '';
  if (!file) return;
  const invalid = validateAvatar(file);
  if (invalid) {
    error.value = fieldText(invalid);
    return;
  }
  busy.value = true;
  try {
    const result = await profile.uploadAvatar(file);
    emit('uploaded', result.avatarUrl);
  } catch (failure) {
    error.value = errorText(toApiError(failure), 'errors.SAVE_FAILED');
  } finally {
    busy.value = false;
  }
}
</script>
