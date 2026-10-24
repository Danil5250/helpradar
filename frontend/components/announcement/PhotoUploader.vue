<template>
  <div class="w-full mb-4">
    <div class="flex flex-col">
      <span class="font-montserratRegular">{{ t('add_photo') }} <span class="text-sage text-sm">({{ t('optional') }}, {{ t('photos_limit', { max: LIMITS.maxPhotos }) }})</span></span>
      <button
        type="button"
        class="w-52 mb-2 mt-2 p-2 uppercase text-center border-2 rounded-lg outline-none border-sage text-forest font-bold hover:border-olive disabled:opacity-50"
        :disabled="total >= LIMITS.maxPhotos"
        data-test="add-photo"
        @click="input?.click()"
      >
        {{ t('add') }}
      </button>
      <input ref="input" type="file" multiple :accept="PHOTO_TYPES.join(',')" class="hidden" data-test="photo-input" @change="onSelect" />
      <FieldError :text="fieldText(error)" />

      <ul class="flex flex-col gap-1">
        <li v-for="photo in existing" :key="`photo-${photo.id}`" class="flex items-center justify-between mt-1 p-3 rounded-lg border-2 bg-almost-white border-sand-dark">
          <img :src="photo.url" alt="" class="h-12 w-12 object-cover rounded mr-3" />
          <p class="font-montserratRegular text-sm flex-1">{{ t('photo_attached') }}</p>
          <button type="button" :aria-label="t('delete')" @click="emit('removeExisting', photo.id)"><img :src="deleteImg" alt="" /></button>
        </li>
        <li v-for="file in files" :key="file.name + file.size" class="flex items-center justify-between mt-1 p-3 rounded-lg border-2 bg-almost-white border-sand-dark">
          <img :src="preview(file)" alt="" class="h-12 w-12 object-cover rounded mr-3" />
          <p class="font-montserratRegular text-sm flex-1 break-all">{{ file.name }}</p>
          <button type="button" :aria-label="t('delete')" @click="remove(file)"><img :src="deleteImg" alt="" /></button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
// Imports
import deleteImg from '~/assets/images/DeleteImg.svg';
import type { Photo } from '~/types/announcement';
import { LIMITS, PHOTO_TYPES, validatePhoto } from '~/utils/validation';

// Props
const files = defineModel<File[]>({ required: true });
const props = defineProps<{ existing?: Photo[] }>();

// Emits
const emit = defineEmits<{ removeExisting: [photoId: number] }>();

// Utils
const { t } = useI18n();
const fieldText = useFieldErrorText();

// Data
const input = ref<HTMLInputElement | null>(null);
const error = ref('');
const previews = ref(new Map<File, string>());

// Computed
const total = computed(() => files.value.length + (props.existing?.length ?? 0));

// Methods
function preview(file: File): string {
  let url = previews.value.get(file);
  if (!url) {
    url = URL.createObjectURL(file);
    previews.value.set(file, url);
  }
  return url;
}

function onSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  error.value = '';
  const accepted: File[] = [];
  for (const file of Array.from(target.files ?? [])) {
    if (validatePhoto(file)) {
      error.value = 'PHOTO_INVALID';
    } else if (total.value + accepted.length >= LIMITS.maxPhotos) {
      error.value = 'PHOTO_LIMIT';
    } else {
      accepted.push(file);
    }
  }
  files.value = [...files.value, ...accepted];
  target.value = '';
}

function remove(file: File) {
  const url = previews.value.get(file);
  if (url) URL.revokeObjectURL(url);
  previews.value.delete(file);
  files.value = files.value.filter((item) => item !== file);
  error.value = '';
}

// Lifecycle
onBeforeUnmount(() => previews.value.forEach((url) => URL.revokeObjectURL(url)));
</script>
