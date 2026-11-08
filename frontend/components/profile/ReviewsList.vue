<template>
  <section>
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
      <h2 class="font-kharkiv text-h5 xl:text-h4">{{ t('reviews') }}</h2>
      <AppSelect v-model="sort" :options="sortOptions" :prefix="t('sort_by')" data-test="reviews-sort" />
    </div>

    <LoadingSpinner v-if="loading && items.length === 0" />
    <p v-else-if="loadError" class="border-l-4 border-radar bg-sand rounded-r-lg px-3 py-2" role="alert">{{ loadError }}</p>
    <p v-else-if="items.length === 0" class="text-sage font-montserratMedium" data-test="reviews-empty">{{ t('no_reviews') }}</p>

    <ul v-else class="flex flex-col gap-4" data-test="reviews-list">
      <li v-for="review in items" :key="review.id" class="border-2 border-sand rounded-2xl p-4">
        <div class="flex items-center gap-3">
          <img :src="review.author.avatarUrl" alt="" class="w-10 h-10 rounded-full object-cover" />
          <div class="flex-1">
            <p class="font-montserratMedium">{{ review.author.name }}</p>
            <p class="text-xs text-sage">{{ formatDate(review.dateCreated, locale) }}</p>
          </div>
          <ProfileRatingStars :value="review.rating" :show-value="false" />
        </div>
        <ProfileReviewForm
          v-if="editingId === review.id"
          :announcement-id="review.announcementId"
          :review="review"
          @saved="saved"
          @cancel="editingId = null"
        />
        <template v-else>
          <p v-if="review.description" class="mt-3 whitespace-pre-line break-words">{{ review.description }}</p>
          <AppButton v-if="canEditReview(review, user?.id, now)" has-outline class="mt-3" :disabled="loading" :data-test="`review-edit-${review.id}`" @click="editingId = review.id">{{ t('edit_review') }}</AppButton>
        </template>
      </li>
    </ul>

    <div v-if="hasMore && !loadError" class="flex justify-center mt-6">
      <AppButton has-outline :loading="loading" data-test="reviews-more" @click="load(false)">{{ t('show_more') }}</AppButton>
    </div>
  </section>
</template>

<script setup lang="ts">
// Imports
import type { Review, ReviewSort } from '~/types/profile';
import { canEditReview } from '~/utils/reviews';

// Props
const props = defineProps<{ userId: number }>();

// Emits
const emit = defineEmits<{ updated: [] }>();

// Composables
const profile = useProfile();
const { user } = useAuth();

// Utils
const { t, locale } = useI18n();
const errorText = useApiErrorText();

// Data
const items = ref<Review[]>([]);
const page = ref(1);
const hasMore = ref(false);
const loading = ref(false);
const loadError = ref('');
const sort = ref<ReviewSort>('newest');
const editingId = ref<number | null>(null);
const now = ref(Date.now());
let editTimer: ReturnType<typeof setInterval> | undefined;

// Computed
const sortOptions = computed<{ value: ReviewSort; label: string }[]>(() => [
  { value: 'newest', label: t('reviews_newest') },
  { value: 'rating', label: t('reviews_by_rating') },
]);

// Methods
function saved(review: Review) {
  items.value = items.value.map((item) => (item.id === review.id ? review : item));
  editingId.value = null;
  emit('updated');
}

async function load(reset: boolean) {
  if (loading.value) return;
  loading.value = true;
  loadError.value = '';
  if (reset) page.value = 1;
  try {
    const result = await profile.reviews(props.userId, { page: page.value, sort: sort.value });
    items.value = reset ? result.items : [...items.value, ...result.items];
    hasMore.value = result.hasMore;
    page.value += 1;
  } catch (error) {
    loadError.value = errorText(toApiError(error), 'errors.REVIEWS_UNAVAILABLE');
  } finally {
    loading.value = false;
  }
}

// Watchers
watch(sort, () => {
  editingId.value = null;
  void load(true);
});
watch(() => user.value?.id, () => (editingId.value = null));

// Lifecycle
onMounted(() => {
  void load(true);
  editTimer = setInterval(() => (now.value = Date.now()), 1000);
});
onBeforeUnmount(() => clearInterval(editTimer));
</script>
