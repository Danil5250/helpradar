<template>
  <div class="max-w-screen-lg h-auto mx-auto p-4">
    <LoadingSpinner v-if="loading" />
    <div v-else-if="problem" class="text-center my-16" role="alert">
      <p class="inline-block border-l-4 border-radar bg-almost-white rounded-r-lg px-4 py-3 mb-6" data-test="details-problem">{{ problem.text }}</p>
      <div>
        <AppButton v-if="problem.code !== 'ANNOUNCEMENT_UNAVAILABLE'" is-filled class="mr-3" @click="load">{{ t('try_again') }}</AppButton>
        <NuxtLink to="/main"><AppButton has-outline>{{ t('back_to_list') }}</AppButton></NuxtLink>
      </div>
    </div>

    <template v-else-if="details">
      <h1 class="xl:text-h3 sm:text-h4 font-kharkiv uppercase text-center break-words" data-test="title">{{ details.title }}</h1>

      <div class="flex sm:flex-col xl:flex-row h-auto gap-8 mt-8">
        <div class="w-full h-auto xl:w-2/3 sm:order-2 xl:order-1">
          <p class="text-sm text-sage mb-2">{{ t(`category.${details.category.id}`, details.category.name) }}</p>
          <p class="font-montserratRegular text-lg whitespace-pre-line break-words mt-2" data-test="description">{{ details.description }}</p>
          <template v-if="photos.length > 0">
            <div class="flex justify-center my-[4vh]">
              <button type="button" class="block max-w-full" :aria-label="t('open_photo')" @click="viewerOpen = true">
                <img :src="photos[selectedImage].url" alt="" class="w-full max-h-[28rem] object-contain rounded-lg cursor-pointer" data-test="photo" />
              </button>
            </div>
            <div v-if="photos.length > 1" class="flex justify-center mt-2 gap-2">
              <button
                v-for="(photo, index) in photos"
                :key="photo.id"
                type="button"
                class="h-2 cursor-pointer rounded-full transition-all duration-500 ease-in-out"
                :class="selectedImage === index ? 'bg-forest w-12' : 'bg-sage/40 w-8'"
                :aria-label="`${t('photo')} ${index + 1}`"
                :aria-current="selectedImage === index"
                @click="selectedImage = index"
              />
            </div>
            <div v-if="viewerOpen" class="fixed inset-0 bg-charcoal/80 flex items-center justify-center z-50" role="dialog" aria-modal="true" :aria-label="t('photo')" @click="viewerOpen = false" @keydown.esc="viewerOpen = false">
              <img :src="photos[selectedImage].url" alt="" class="max-w-[90vw] max-h-[85vh] rounded-lg" />
              <button v-if="photos.length > 1" type="button" class="absolute left-[4vw] top-1/2 -translate-y-1/2 text-almost-white text-4xl px-3" :aria-label="t('previous')" @click.stop="prevImage">‹</button>
              <button v-if="photos.length > 1" type="button" class="absolute right-[4vw] top-1/2 -translate-y-1/2 text-almost-white text-4xl px-3" :aria-label="t('next')" @click.stop="nextImage">›</button>
              <button type="button" class="absolute top-6 right-6 text-almost-white" :aria-label="t('close')" @click.stop="viewerOpen = false"><AppIcon name="close" class="h-8 w-8" /></button>
            </div>
          </template>
          <div class="mt-6">
            <AnnouncementLocationMap :approx="details.approxLocation" :exact="details.exactLocation" />
            <p v-if="details.exactLocation?.address" class="mt-2 font-montserratMedium flex items-center gap-2" data-test="exact-address">
              <AppIcon name="pin" class="text-forest" />{{ details.exactLocation.address }}
            </p>
          </div>
        </div>
        <aside class="w-full xl:w-1/3 sm:order-1 xl:order-2 flex flex-col bg-almost-white h-auto rounded-3xl pr-[2vw] py-[4vh] flex-1 self-start">
          <div class="flex justify-between w-full items-center gap-2">
            <span class="text-almost-white px-4 pr-[5vw] py-1 rounded-r-full" :class="details.type === 'HelpRequest' ? 'bg-forest' : 'bg-sage'" data-test="type">
              {{ t(details.type === 'HelpRequest' ? 'help_request' : 'help_offer') }}
            </span>
            <span v-if="details.isUrgent" class="bg-radar text-charcoal font-bold rounded-full px-4 py-1" data-test="urgent">{{ t('urgent') }}</span>
          </div>

          <p class="pl-[2vw] mt-4"><span class="px-3 py-1 rounded-full text-sm font-montserratMedium" :class="details.status === 'Active' ? 'bg-olive text-charcoal' : 'bg-sand-dark text-charcoal'" data-test="status">{{ t(`status.${details.status}`) }}</span></p>

          <div class="flex items-center pl-[2vw] mt-4">
            <AppIcon name="calendar" class="mr-2 text-forest" />
            <p class="font-montserratRegular font-semibold">{{ formatDate(details.datePosted, locale) }} – {{ formatDate(details.expiresAt, locale) }}</p>
          </div>
          <p v-if="details.status === 'Active' && hoursToExpiry > 0 && hoursToExpiry <= 24" class="pl-[2vw] mt-2"><span class="bg-radar text-charcoal font-bold rounded-full px-3 py-1 text-sm">{{ t('expires_soon') }}</span></p>

          <div class="flex items-center pl-[2vw] mt-4">
            <AppIcon name="pin" class="mr-2 text-forest" />
            <p class="font-montserratRegular font-semibold">{{ details.exactLocation ? t('exact_location') : t('approximate_area') }}</p>
          </div>

          <div class="flex items-center pl-[2vw] mt-4">
            <AppIcon name="user" class="mr-2 text-forest" />
            <div class="flex flex-col items-start">
              <p class="font-montserratRegular font-semibold">{{ t('review_ad') }}: {{ details.viewsCount }}</p>
            </div>
          </div>

          <div class="flex items-center justify-start p-4 mb-2 mt-4 ml-4">
            <img src="/avatar-placeholder.svg" alt="" class="w-16 h-16 rounded-full object-cover mr-3" />
            <div class="pl-[1vw]">
              <p class="font-montserratMedium font-semibold uppercase">{{ t('ad_author') }}:</p>
              <h4 class="font-montserratMedium" data-test="author">
                {{ details.author.name }}<span v-if="details.author.rating !== null" class="ml-2">★ {{ details.author.rating.toFixed(1) }}</span>
              </h4>
            </div>
          </div>
          <div v-if="details.isOwner && details.allowedActions.length > 0" class="pl-[2vw] mt-4">
            <AnnouncementOwnerActions :id="details.id" :actions="details.allowedActions" @updated="updated" @deleted="deleted" />
          </div>
          <p v-if="details.isOwner && details.status === 'Closed' && details.republishUntil" class="pl-[2vw] mt-3 text-sm text-sage">{{ t('republish_until', { date: formatDate(details.republishUntil, locale) }) }}</p>
          <p v-if="details.isOwner && details.status === 'InProgress'" class="pl-[2vw] mt-3 text-sm border-l-4 border-sage ml-[2vw] pl-2">{{ t('errors.EDIT_IN_PROGRESS') }}</p>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// Imports
import type { AnnouncementDetails } from '~/types/announcement';

// Composables
const announcements = useAnnouncements();

// Data
const details = ref<AnnouncementDetails | null>(null);
const loading = ref(true);
const problem = ref<{ code: string; text: string } | null>(null);
const selectedImage = ref(0);
const viewerOpen = ref(false);

// Utils
const { t, locale } = useI18n();
const route = useRoute();
const errorText = useApiErrorText();
useHead({ title: computed(() => (details.value ? `${details.value.title} - HelpRadar` : t('helmet_details'))) });

// Computed
const photos = computed(() => details.value?.photos ?? []);
const hoursToExpiry = computed(() => (details.value ? hoursLeft(details.value.expiresAt) : 0));

// Methods
async function load() {
  loading.value = true;
  problem.value = null;
  try {
    details.value = await announcements.get(String(route.params.id));
  } catch (error) {
    const apiError = toApiError(error);
    problem.value = { code: apiError.code, text: errorText(apiError, 'errors.DETAILS_UNAVAILABLE') };
  } finally {
    loading.value = false;
  }
}

function prevImage() {
  selectedImage.value = (selectedImage.value - 1 + photos.value.length) % photos.value.length;
}

function nextImage() {
  selectedImage.value = (selectedImage.value + 1) % photos.value.length;
}

function updated(announcement: AnnouncementDetails) {
  details.value = announcement;
}

async function deleted() {
  await navigateTo('/my-announcements');
}

// Lifecycle
onMounted(load);
</script>
