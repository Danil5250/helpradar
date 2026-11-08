<template>
  <form class="bg-sand rounded-2xl p-4 mt-4" novalidate data-test="review-form" @submit.prevent="submit">
    <h3 class="font-kharkiv text-h5 mb-3">{{ t(review ? 'edit_review' : 'leave_review') }}</h3>
    <p v-if="review" class="text-sm text-sage mb-3">{{ t('review_edit_hint') }}</p>
    <fieldset :disabled="busy">
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
    <textarea id="review-text" v-model="description" rows="4" :maxlength="LIMITS.commentMax" :disabled="busy" class="w-full p-3 border-2 rounded-lg outline-none bg-almost-white border-sage focus:border-forest" data-test="review-text" />
    <p class="text-xs text-sage text-right">{{ description.length }}/{{ LIMITS.commentMax }}</p>
    <FieldError :text="fieldText(errors.description)" />
    <p v-if="submitError" class="mt-2 border-l-4 border-radar bg-almost-white rounded-r-lg px-3 py-2" role="alert">{{ submitError }}</p>
    <div class="flex flex-wrap gap-3 mt-3">
      <AppButton type="submit" is-filled :loading="busy" data-test="review-submit">{{ t(review ? 'saveUPPER' : 'send') }}</AppButton>
      <AppButton v-if="review" has-outline :disabled="busy" data-test="review-cancel" @click="emit('cancel')">{{ t('cancel') }}</AppButton>
    </div>
  </form>
</template>

<script setup lang="ts">
// Imports
import { LIMITS } from '~/utils/validation';
import type { Review } from '~/types/profile';

// Props
const props = defineProps<{ announcementId: number; review?: Review }>();

// Emits
const emit = defineEmits<{ saved: [review: Review]; cancel: [] }>();

// Composables
const profile = useProfile();
const { show } = useFlash();

// Utils
const { t } = useI18n();
const fieldText = useFieldErrorText();
const errorText = useApiErrorText();

// Data
const rating = ref(props.review?.rating ?? 0);
const description = ref(props.review?.description ?? '');
const errors = ref<{ rating?: string; description?: string }>({});
const submitError = ref('');
const busy = ref(false);

// Methods
async function submit() {
  if (busy.value) return;
  errors.value = {};
  submitError.value = '';
  if (rating.value < 1) errors.value.rating = 'RATING_REQUIRED';
  if (description.value.length > LIMITS.commentMax) errors.value.description = 'COMMENT_TOO_LONG';
  if (Object.keys(errors.value).length > 0) return;
  busy.value = true;
  try {
    const text = description.value.trim();
    const result = props.review
      ? await profile.updateReview(props.review.id, { rating: rating.value, description: text })
      : await profile.leaveReview(props.announcementId, { rating: rating.value, description: text || undefined });
    show(t(props.review ? 'review_updated' : 'review_thanks'));
    emit('saved', result.comment);
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
