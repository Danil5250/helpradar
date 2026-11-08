<template>
  <form class="bg-sand rounded-2xl p-4 mt-4" novalidate data-test="review-form" @submit.prevent="submit">
    <h3 class="font-kharkiv text-h5 mb-3">{{ t('leave_review') }}</h3>
    <fieldset>
      <legend class="font-montserratRegular mb-2">{{ t('your_rating') }}*</legend>
      <div class="flex gap-1" role="radiogroup">
        <button
          v-for="star in 5"
          :key="star"
          type="button"
          role="radio"
          class="text-3xl leading-none"
          :class="star <= rating ? 'text-radar' : 'text-sand-dark'"
          :aria-checked="rating === star"
          :aria-label="t('rating_value', { value: star })"
          :data-test="`review-star-${star}`"
          @click="rating = star"
        >
          ★
        </button>
      </div>
      <FieldError :text="fieldText(errors.rating)" />
    </fieldset>
    <label for="review-text" class="font-montserratRegular mt-3 mb-2 block">{{ t('comment') }} <span class="text-sage text-sm">({{ t('optional') }})</span></label>
    <textarea id="review-text" v-model="description" rows="4" :maxlength="LIMITS.commentMax" class="w-full p-3 border-2 rounded-lg outline-none bg-almost-white border-sage focus:border-forest" data-test="review-text" />
    <p class="text-xs text-sage text-right">{{ description.length }}/{{ LIMITS.commentMax }}</p>
    <FieldError :text="fieldText(errors.description)" />
    <p v-if="submitError" class="mt-2 border-l-4 border-radar bg-almost-white rounded-r-lg px-3 py-2" role="alert">{{ submitError }}</p>
    <AppButton type="submit" is-filled :loading="busy" class="mt-3" data-test="review-submit">{{ t('send') }}</AppButton>
  </form>
</template>

<script setup lang="ts">
// Imports
import { LIMITS } from '~/utils/validation';

// Props
const props = defineProps<{ announcementId: number }>();

// Emits
const emit = defineEmits<{ saved: [] }>();

// Composables
const profile = useProfile();
const { show } = useFlash();

// Utils
const { t } = useI18n();
const fieldText = useFieldErrorText();
const errorText = useApiErrorText();

// Data
const rating = ref(0);
const description = ref('');
const errors = ref<{ rating?: string; description?: string }>({});
const submitError = ref('');
const busy = ref(false);

// Methods
async function submit() {
  errors.value = {};
  submitError.value = '';
  if (rating.value < 1) errors.value.rating = 'RATING_REQUIRED';
  if (description.value.length > LIMITS.commentMax) errors.value.description = 'COMMENT_TOO_LONG';
  if (Object.keys(errors.value).length > 0) return;
  busy.value = true;
  try {
    await profile.leaveReview(props.announcementId, { rating: rating.value, description: description.value.trim() || undefined });
    show(t('review_thanks'));
    emit('saved');
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.code === 'VALIDATION_FAILED') {
      errors.value = { rating: apiError.fields.rating?.code, description: apiError.fields.description?.code };
    } else {
      submitError.value = errorText(apiError, 'errors.SAVE_FAILED');
    }
  } finally {
    busy.value = false;
  }
}
</script>
