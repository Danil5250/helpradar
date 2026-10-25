<template>
  <div class="w-full mt-[2vh] px-4">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <h1 class="font-kharkiv text-h3 xl:text-h2">{{ t('advertisement') }}</h1>

      <div class="flex flex-col md:flex-row md:space-x-4 gap-4 md:gap-0 items-stretch md:items-center">
        <NuxtLink v-if="canPublish" to="/add-announcement" class="w-full md:w-auto">
          <AppButton is-filled class="px-4 w-full md:w-auto" data-test="add-announcement">
            <AppIcon name="plus" class="inline mr-1" />{{ role === 'volunteer' ? t('offer_help') : t('create_request') }}
          </AppButton>
        </NuxtLink>
        <div class="relative w-full md:w-auto">
          <AppButton has-outline class="px-2 w-full md:w-auto flex items-center justify-center space-x-3" :class="dropdownOpen ? '!rounded-b-none !rounded-t-3xl' : 'rounded-3xl'" aria-haspopup="listbox" :aria-expanded="dropdownOpen" data-test="sort-button" @click="dropdownOpen = !dropdownOpen">
            <span class="font-montserratMedium">{{ t('sort_by') }}: {{ t(sortOptions.find((option) => option.value === sort)?.label ?? 'sort_newest') }}</span>
            <AppIcon name="chevron-down" class="h-4 w-4 transition-transform duration-300" :class="{ 'rotate-180': dropdownOpen }" />
          </AppButton>
          <ul v-if="dropdownOpen" role="listbox" class="w-full min-w-[14rem] bg-almost-white border-2 border-forest rounded-b-3xl absolute left-0 top-full z-10 -mt-1 overflow-hidden">
            <li
              v-for="option in sortOptions"
              :key="option.value"
              role="option"
              tabindex="0"
              :aria-selected="sort === option.value"
              class="cursor-pointer py-2 px-4 hover:bg-sand"
              :class="sort === option.value ? 'font-bold text-forest' : 'text-charcoal'"
              :data-test="`sort-${option.value}`"
              @click="chooseSort(option.value)"
              @keydown.enter="chooseSort(option.value)"
            >
              {{ t(option.label) }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <p v-if="locationNote" class="mt-4 border-l-4 border-sage bg-almost-white rounded-r-lg px-3 py-2" role="status">{{ locationNote }}</p>
    <p v-if="!isAuthenticated" class="mt-4 border-l-4 border-sage bg-almost-white rounded-r-lg px-3 py-2" data-test="guest-note">
      {{ t('guest_note') }}
      <NuxtLink to="/login" class="font-bold underline hover:text-forest">{{ t('log_in') }}</NuxtLink> /
      <NuxtLink to="/registration" class="font-bold underline hover:text-forest">{{ t('to_register') }}</NuxtLink>
    </p>

    <LoadingSpinner v-if="!loadedOnce" />

    <template v-else>
      <div v-if="items.length > 0" class="w-full mt-4 flex flex-wrap justify-start" data-test="list">
        <div v-for="item in items" :key="item.id" class="w-full md:w-[48%] xl:w-[32%] mr-[1vw] p-2 mt-4">
          <AnnouncementCard :announcement="item" />
        </div>
      </div>

      <div v-else-if="!loadError" class="flex flex-col items-center justify-center my-[10%] w-full text-charcoal" data-test="empty">
        <img src="~/assets/images/NothingFound.png" alt="" class="xl:w-[20vw] xl:h-auto sm:w-[50vw] md:w-[20vw] md:h-auto mb-4" />
        <div class="text-center font-montserratMedium">{{ t('no_announcements_nearby') }}</div>
      </div>

      <div v-if="loadError" class="my-10 text-center" role="alert">
        <p class="mb-4 border-l-4 border-radar bg-almost-white rounded-r-lg px-3 py-2 inline-block" data-test="list-error">{{ loadError }}</p>
        <div><AppButton has-outline @click="load(items.length === 0)">{{ t('try_again') }}</AppButton></div>
      </div>
      <div v-if="hasMore && items.length > 0 && !loadError" class="w-full flex justify-center mt-8">
        <AppButton is-filled class="uppercase" :loading="loading" data-test="show-more" @click="load(false)">{{ t('show_more') }}</AppButton>
      </div>
      <div ref="sentinel" class="h-1" aria-hidden="true" />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { AnnouncementListItem, AnnouncementSort } from '~/types/announcement';

const { t } = useI18n();
const { user, isAuthenticated, role, canPublish } = useAuth();
const announcements = useAnnouncements();
const errorText = useApiErrorText();
useHead({ title: computed(() => t('helmet_main')), meta: [{ name: 'description', content: computed(() => t('main_description')) }] });

const items = ref<AnnouncementListItem[]>([]);
const page = ref(1);
const hasMore = ref(true);
const loading = ref(false);
const loadedOnce = ref(false);
const loadError = ref('');
const sort = ref<AnnouncementSort>('newest');
const dropdownOpen = ref(false);
const position = ref<{ lat: number; lng: number } | null>(null);
const locationNote = ref('');

function useProfileCity(): boolean {
  const coordinates = cityCoordinates(user.value?.city);
  if (coordinates) position.value = coordinates;
  return coordinates !== null;
}

function requestDevicePosition(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(false);
    navigator.geolocation.getCurrentPosition(
      (result) => {
        position.value = { lat: result.coords.latitude, lng: result.coords.longitude };
        resolve(true);
      },
      () => resolve(false),
      { timeout: 8000, maximumAge: 300_000 },
    );
  });
}

async function load(reset: boolean) {
  if (loading.value) return;
  loading.value = true;
  loadError.value = '';
  if (reset) {
    page.value = 1;
    hasMore.value = true;
  }
  try {
    const result = await announcements.list({
      page: page.value,
      sort: sort.value,
      lat: position.value?.lat,
      lng: position.value?.lng,
    });
    items.value = reset ? result.items : [...items.value, ...result.items];
    hasMore.value = result.hasMore;
    page.value += 1;
  } catch (error) {
    loadError.value = errorText(toApiError(error), 'errors.LIST_UNAVAILABLE');
  } finally {
    loading.value = false;
    loadedOnce.value = true;
  }
}

async function chooseSort(next: AnnouncementSort) {
  dropdownOpen.value = false;
  locationNote.value = '';
  if (next === 'nearest' && !position.value) {
    const granted = (await requestDevicePosition()) || useProfileCity();
    if (!granted) {
      locationNote.value = t('nearest_needs_location');
      return;
    }
  }
  sort.value = next;
  await load(true);
}

onMounted(async () => {
  if (isAuthenticated.value) useProfileCity();
  await load(true);
});
const sentinel = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;
onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting) && hasMore.value && !loading.value && loadedOnce.value && !loadError.value) {
      void load(false);
    }
  }, { rootMargin: '200px' });
  watch(sentinel, (element, previous) => {
    if (previous) observer?.unobserve(previous);
    if (element) observer?.observe(element);
  }, { immediate: true });
});
onBeforeUnmount(() => observer?.disconnect());

const sortOptions: { value: AnnouncementSort; label: string }[] = [
  { value: 'newest', label: 'sort_newest' },
  { value: 'urgent', label: 'sort_urgent' },
  { value: 'nearest', label: 'sort_nearest' },
];
</script>
