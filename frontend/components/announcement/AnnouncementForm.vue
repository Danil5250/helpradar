<template>
  <form class="max-w-3xl mx-auto" novalidate @submit.prevent="submit">
    <h1 class="text-h3 xl:text-h2 font-kharkiv text-center mb-6">{{ isEdit ? t('edit_announcement') : t('fill_the_data') }}</h1>
    <p class="mb-6 border-l-8 border-radar bg-almost-white rounded-r-2xl px-4 py-3 font-montserratMedium" role="note" data-test="emergency-note">{{ t('call_112') }}</p>
    <div class="w-full flex flex-col mb-4">
      <label for="ann-title" class="font-montserratRegular mb-2">{{ t('announcement_title') }}*</label>
      <input
        id="ann-title"
        v-model="values.title"
        type="text"
        name="title"
        :maxlength="LIMITS.titleMax"
        :placeholder="t('name_ad')"
        :class="[inputClass, { 'border-radar': errors.title }]"
        :aria-invalid="!!errors.title"
        aria-describedby="ann-title-error"
        data-test="title"
      />
      <FieldError id="ann-title-error" :text="fieldText(errors.title)" />
    </div>
    <AnnouncementLocationPicker v-model="location" :error="errors.location" :auto-locate="!isEdit" />
    <div class="w-full flex flex-col mb-4">
      <label for="ann-description" class="font-montserratRegular mb-2">{{ t('description') }}*</label>
      <textarea
        id="ann-description"
        v-model="values.description"
        name="description"
        :maxlength="LIMITS.descriptionMax"
        :placeholder="t('your_description')"
        rows="6"
        :class="[inputClass, 'resize-none', { 'border-radar': errors.description }]"
        :aria-invalid="!!errors.description"
        aria-describedby="ann-description-error ann-description-count"
        data-test="description"
      />
      <p id="ann-description-count" class="text-sm text-sage self-end">{{ values.description.length }} / {{ LIMITS.descriptionMax }}</p>
      <FieldError id="ann-description-error" :text="fieldText(errors.description)" />
    </div>
    <AnnouncementPhotoUploader v-model="newPhotos" :existing="existingPhotos" @remove-existing="removeExisting" />
    <AnnouncementCategoryChips v-model="values.categoryId" :categories="categories" :error="errors.categoryId" />
    <div class="grid md:grid-cols-2 gap-4 mb-6">
      <div class="flex flex-col">
        <label for="ann-expiry" class="font-montserratRegular mb-2">{{ t('expiry_days') }}*</label>
        <input
          id="ann-expiry"
          v-model.number="values.expiryDays"
          type="number"
          inputmode="numeric"
          :min="LIMITS.expiryMin"
          :max="LIMITS.expiryMax"
          :class="[inputClass, { 'border-radar': errors.expiryDays }]"
          :aria-invalid="!!errors.expiryDays"
          aria-describedby="ann-expiry-error ann-expiry-hint"
          data-test="expiry"
        />
        <p id="ann-expiry-hint" class="text-sm text-sage mt-1">{{ t('expiry_hint') }}</p>
        <FieldError id="ann-expiry-error" :text="fieldText(errors.expiryDays)" />
      </div>

      <div v-if="isHelpRequest" class="flex flex-col justify-end">
        <label class="flex items-start gap-3 font-montserratRegular cursor-pointer p-3 border-2 rounded-lg border-sage bg-almost-white">
          <input v-model="values.isUrgent" type="checkbox" class="mt-1 h-5 w-5 accent-forest" data-test="urgent" />
          <span><span class="font-bold">{{ t('urgent') }}</span><br /><span class="text-sm text-sage">{{ t('urgent_hint') }}</span></span>
        </label>
        <FieldError :text="fieldText(errors.isUrgent)" />
      </div>
    </div>

    <div role="alert">
      <p v-if="generalError" class="mb-4 border-l-4 border-radar bg-almost-white rounded-r-lg px-3 py-2" data-test="form-error">{{ generalError }}</p>
    </div>

    <AppButton type="submit" is-filled :loading="submitting" class="w-full text-charcoal uppercase font-montserratRegular py-4 rounded-full mb-6" data-test="submit">
      {{ isEdit ? t('save_changes') : t('publish') }}
    </AppButton>
  </form>
</template>

<script setup lang="ts">
// Imports
import type { AnnouncementDetails, AnnouncementPayload, Category, LocationValue, Photo } from '~/types/announcement';
import {
  LIMITS,
  validateAnnouncement,
  type AnnouncementField,
  type AnnouncementFormValues,
} from '~/utils/validation';

// Props
const props = defineProps<{ mode: 'create' | 'edit'; categories: Category[]; initial?: AnnouncementDetails | null }>();

// Composables
const { role, sessionEnded } = useAuth();
const { show } = useFlash();
const announcements = useAnnouncements();

// Utils
const { t } = useI18n();
const route = useRoute();
const errorText = useApiErrorText();
const fieldText = useFieldErrorText();

// Data
const values = reactive<AnnouncementFormValues>({
  title: '',
  description: '',
  categoryId: null,
  address: '',
  latitude: null,
  longitude: null,
  expiryDays: LIMITS.expiryDefault,
  isUrgent: false,
});
const newPhotos = ref<File[]>([]);
const existingPhotos = ref<Photo[]>([]);
const removedPhotoIds = ref<number[]>([]);
const errors = ref<Partial<Record<AnnouncementField, string>>>({});
const generalError = ref('');
const submitting = ref(false);

// Constants
const DRAFT_KEY = 'hr_announcement_draft_v1';
let initialExpiryDays: number = LIMITS.expiryDefault;
let draftTimer: ReturnType<typeof setTimeout> | undefined;
const inputClass = 'w-full p-3 border-2 rounded-lg outline-none bg-almost-white border-sage focus:border-forest';

// Computed
const isEdit = computed(() => props.mode === 'edit');
const isHelpRequest = computed(() => (props.initial ? props.initial.type === 'HelpRequest' : role.value === 'person_in_need'));
const location = computed<LocationValue>({
  get: () => ({ address: values.address, latitude: values.latitude, longitude: values.longitude }),
  set: (value) => {
    values.address = value.address;
    values.latitude = value.latitude;
    values.longitude = value.longitude;
  },
});

// Methods
function applyInitial(details: AnnouncementDetails) {
  values.title = details.title;
  values.description = details.description;
  values.categoryId = details.category.id;
  values.address = details.exactLocation?.address ?? '';
  values.latitude = details.exactLocation?.latitude ?? null;
  values.longitude = details.exactLocation?.longitude ?? null;
  values.isUrgent = details.isUrgent;
  const daysLeft = Math.ceil((new Date(details.expiresAt).getTime() - Date.now()) / 86_400_000);
  initialExpiryDays = Math.min(LIMITS.expiryMax, Math.max(LIMITS.expiryMin, daysLeft));
  values.expiryDays = initialExpiryDays;
  existingPhotos.value = [...details.photos];
}

function clearDraft() {
  if (draftTimer) clearTimeout(draftTimer);
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
  }
}

function removeExisting(photoId: number) {
  removedPhotoIds.value.push(photoId);
  existingPhotos.value = existingPhotos.value.filter((photo) => photo.id !== photoId);
}

function payload(): AnnouncementPayload {
  const body: AnnouncementPayload = {
    title: values.title.trim(),
    description: values.description.trim(),
    categoryId: values.categoryId as number,
  };
  if (values.address.trim()) body.address = values.address.trim();
  if (values.latitude !== null && values.longitude !== null) {
    body.latitude = values.latitude;
    body.longitude = values.longitude;
  }
  if (!isEdit.value || values.expiryDays !== initialExpiryDays) body.expiryDays = values.expiryDays;
  if (isHelpRequest.value) body.isUrgent = values.isUrgent;
  return body;
}

async function submit() {
  generalError.value = '';
  errors.value = validateAnnouncement(values, isHelpRequest.value);
  if (Object.keys(errors.value).length > 0) {
    generalError.value = t('errors.VALIDATION_FAILED');
    await nextTick();
    const target =
      document.querySelector<HTMLElement>('[aria-invalid="true"]') ?? document.querySelector<HTMLElement>('[data-field-error]');
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    target?.focus?.({ preventScroll: true });
    return;
  }

  submitting.value = true;
  try {
    const result = isEdit.value
      ? await announcements.update((props.initial as AnnouncementDetails).id, payload())
      : await announcements.create(payload());
    const id = result.announcement.id;
    let photoProblem = false;
    for (const photoId of removedPhotoIds.value) await announcements.removePhoto(id, photoId).catch(() => (photoProblem = true));
    for (const file of newPhotos.value) {
      try {
        await announcements.addPhoto(id, file);
      } catch {
        photoProblem = true;
      }
    }

    clearDraft();
    const done = t(isEdit.value ? 'changes_saved' : 'announcement_published');
    if (photoProblem) show(`${done} ${t('errors.PHOTO_INVALID')}`, 'alert');
    else show(done, 'success');
    await navigateTo(`/main/announcement/${id}`);
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.status === 401) {
      sessionEnded();
      await navigateTo({ path: '/login', query: { redirect: route.fullPath } });
      return;
    }
    if (apiError.code === 'VALIDATION_FAILED') {
      const next: Partial<Record<AnnouncementField, string>> = {};
      for (const [field, info] of Object.entries(apiError.fields)) {
        const key = ['latitude', 'longitude', 'address', 'location'].includes(field) ? 'location' : (field as AnnouncementField);
        next[key] = info.code;
      }
      errors.value = next;
    } else {
      generalError.value = errorText(apiError, isEdit.value ? 'errors.SAVE_FAILED' : 'errors.PUBLISH_FAILED');
    }
  } finally {
    submitting.value = false;
  }
}

// Watchers
watch(
  () => props.initial,
  (details) => {
    if (details) applyInitial(details);
  },
  { immediate: true },
);
watch(
  values,
  () => {
    if (isEdit.value) return;
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...values }));
      } catch {
      }
    }, 500);
  },
  { deep: true },
);

// Lifecycle
onMounted(() => {
  if (isEdit.value) return;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) Object.assign(values, JSON.parse(raw));
  } catch {
  }
});
onBeforeUnmount(() => draftTimer && clearTimeout(draftTimer));
</script>
