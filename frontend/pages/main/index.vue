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
        <AppSelect
          v-if="view === 'list'"
          :model-value="sort"
          :options="selectSortOptions"
          :prefix="t('sort_by')"
          data-test="sort-button"
          @update:model-value="chooseSort"
        />
      </div>
    </div>

    <div class="flex flex-col md:flex-row md:items-center gap-4 mt-6">
      <div class="inline-flex rounded-full border-2 border-forest overflow-hidden self-start" role="group" :aria-label="t('view_switch')">
        <button
          v-for="option in viewOptions"
          :key="option"
          type="button"
          class="px-6 py-2 font-montserratMedium transition"
          :class="view === option ? 'bg-forest text-almost-white' : 'text-forest hover:bg-sand'"
          :aria-pressed="view === option"
          :data-test="`view-${option}`"
          @click="switchView(option)"
        >
          {{ t(`view_${option}`) }}
        </button>
      </div>
      <AppSelect v-model="radius" :options="radiusOptions" :prefix="t('radius')" data-test="radius" @change="chooseRadius" />
      <p v-if="radiusCounter" class="font-montserratMedium text-forest" data-test="radius-counter">{{ radiusCounter }}</p>
    </div>

    <p v-if="locationNote" class="mt-4 border-l-4 border-sage bg-almost-white rounded-r-lg px-3 py-2" role="status">{{ locationNote }}</p>
    <p v-if="!isAuthenticated" class="mt-4 border-l-4 border-sage bg-almost-white rounded-r-lg px-3 py-2" data-test="guest-note">
      {{ t('guest_note') }}
      <NuxtLink to="/login" class="font-bold underline hover:text-forest">{{ t('log_in') }}</NuxtLink> /
      <NuxtLink to="/registration" class="font-bold underline hover:text-forest">{{ t('to_register') }}</NuxtLink>
    </p>

    <div v-if="view === 'map'" class="mt-6">
      <AnnouncementMap :center="mapCenter" :radius-km="mapRadius" :markers="mapData?.items ?? []" @center-change="changeCenter" @unavailable="mapUnavailable" />
      <p v-if="mapData && mapData.total === 0" class="mt-4 text-center font-montserratMedium" data-test="map-empty">
        {{ t('radius_empty', { km: mapRadius }) }}
      </p>
      <p v-if="mapError" class="mt-4 border-l-4 border-radar bg-almost-white rounded-r-lg px-3 py-2" role="alert">{{ mapError }}</p>
    </div>

    <LoadingSpinner v-else-if="!loadedOnce" />

    <template v-else>
      <div v-if="items.length > 0" class="w-full mt-4 flex flex-wrap justify-start" data-test="list">
        <div v-for="item in items" :key="item.id" class="w-full md:w-[48%] xl:w-[32%] mr-[1vw] p-2 mt-4">
          <AnnouncementCard :announcement="item" />
        </div>
      </div>

      <div v-else-if="!loadError" class="flex flex-col items-center justify-center my-[10%] w-full text-charcoal" data-test="empty">
        <img src="~/assets/images/NothingFound.png" alt="" class="xl:w-[20vw] xl:h-auto sm:w-[50vw] md:w-[20vw] md:h-auto mb-4" />
        <div class="text-center font-montserratMedium">{{ radius && position ? t('radius_empty', { km: radius }) : t('no_announcements_nearby') }}</div>
      </div>

      <div v-if="loadError" class="my-10 text-center" role="alert">
        <p class="mb-4 border-l-4 border-radar bg-almost-white rounded-r-lg px-3 py-2 inline-block" data-test="list-error">{{ loadError }}</p>
        <div>
          <AppButton has-outline @click="load(items.length === 0)">{{ t('try_again') }}</AppButton>
        </div>
      </div>
      <div v-if="hasMore && items.length > 0 && !loadError" class="w-full flex justify-center mt-8">
        <AppButton is-filled class="uppercase" :loading="loading" data-test="show-more" @click="load(false)">{{ t('show_more') }}</AppButton>
      </div>
      <div ref="sentinel" class="h-1" aria-hidden="true" />
    </template>
  </div>
</template>

<script setup lang="ts">
// Imports
import {
  SEARCH_RADII_KM,
  type AnnouncementListItem,
  type AnnouncementSort,
  type AnnouncementTypeFilter,
  type MapAnnouncements,
  type SearchRadiusKm,
} from '~/types/announcement';

// Composables
const { user, isAuthenticated, role, canPublish } = useAuth();
const announcements = useAnnouncements();

// Utils
const { t } = useI18n();
const errorText = useApiErrorText();
useHead({ title: computed(() => t('helmet_main')), meta: [{ name: 'description', content: computed(() => t('main_description')) }] });

// Data
const items = ref<AnnouncementListItem[]>([]);
const page = ref(1);
const hasMore = ref(true);
const loading = ref(false);
const loadedOnce = ref(false);
const loadError = ref('');
const sort = ref<AnnouncementSort>('newest');
const position = ref<{ lat: number; lng: number } | null>(null);
const locationNote = ref('');
const sentinel = ref<HTMLElement | null>(null);
const view = ref<'list' | 'map'>('list');
const radius = ref<SearchRadiusKm | null>(null);
const mapData = ref<MapAnnouncements | null>(null);
const mapError = ref('');

// Constants
let observer: IntersectionObserver | null = null;
let resetQueued = false;
let mapTimer: ReturnType<typeof setInterval> | undefined;
const viewOptions = ['list', 'map'] as const;
const KYIV = { lat: 50.4501, lng: 30.5234 };
const MAP_DEFAULT_RADIUS: SearchRadiusKm = 10;
const MAP_REFRESH_MS = 5000;
const sortOptions: { value: AnnouncementSort; label: string }[] = [
  { value: 'newest', label: 'sort_newest' },
  { value: 'urgent', label: 'sort_urgent' },
  { value: 'nearest', label: 'sort_nearest' },
];

// Computed
const listType = computed<AnnouncementTypeFilter | undefined>(() => {
  if (role.value === 'person_in_need') return 'helpOffer';
  if (role.value === 'volunteer') return 'helpRequest';
  return undefined;
});
const visibleSortOptions = computed(() => (listType.value === 'helpOffer' ? sortOptions.filter((option) => option.value !== 'urgent') : sortOptions));
const selectSortOptions = computed(() => visibleSortOptions.value.map((option) => ({ value: option.value, label: t(option.label) })));
const radiusOptions = computed<{ value: SearchRadiusKm | null; label: string }[]>(() => [
  ...(view.value === 'list' ? [{ value: null, label: t('radius_any') }] : []),
  ...SEARCH_RADII_KM.map((km) => ({ value: km, label: t('radius_km', { km }) })),
]);
const mapCenter = computed(() => position.value ?? KYIV);
const mapRadius = computed<SearchRadiusKm>(() => radius.value ?? MAP_DEFAULT_RADIUS);
const radiusCounter = computed(() =>
  view.value === 'map' && mapData.value ? t('radius_counter', { count: mapData.value.total, km: mapData.value.radiusKm }) : ''
);

// Methods
function useProfileCity(): boolean {
  const coordinates = cityCoordinates(user.value?.city);
  if (coordinates) position.value = coordinates;
  return coordinates !== null;
}

function askPosition(options: PositionOptions): Promise<'ok' | 'denied' | 'unavailable'> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (result) => {
        position.value = { lat: result.coords.latitude, lng: result.coords.longitude };
        resolve('ok');
      },
      (error) => resolve(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      options
    );
  });
}

async function requestDevicePosition(): Promise<'ok' | 'denied' | 'unavailable'> {
  if (!('geolocation' in navigator)) return 'unavailable';
  const first = await askPosition({ timeout: 8000, maximumAge: 300_000 });
  return first === 'unavailable' ? askPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: Infinity }) : first;
}

async function load(reset: boolean) {
  if (loading.value) {
    if (reset) resetQueued = true;
    return;
  }
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
      type: listType.value,
      lat: position.value?.lat,
      lng: position.value?.lng,
      radius: position.value && radius.value ? radius.value : undefined,
    });
    items.value = reset ? result.items : [...items.value, ...result.items];
    hasMore.value = result.hasMore;
    page.value += 1;
  } catch (error) {
    loadError.value = errorText(toApiError(error), 'errors.LIST_UNAVAILABLE');
  } finally {
    loading.value = false;
    loadedOnce.value = true;
    if (resetQueued) {
      resetQueued = false;
      void load(true);
    }
  }
}

async function chooseSort(next: AnnouncementSort) {
  locationNote.value = '';
  if (next === 'nearest' && !position.value) {
    const granted = (await requestDevicePosition()) === 'ok' || useProfileCity();
    if (!granted) {
      locationNote.value = t('nearest_needs_location');
      return;
    }
  }
  sort.value = next;
  await load(true);
}

async function ensurePosition(): Promise<void> {
  if (position.value) return;
  const result = await requestDevicePosition();
  if (result === 'ok') return;
  const city = useProfileCity() ? user.value?.city : null;

  locationNote.value = result === 'denied' ? t('map_location_denied') : t('map_location_unknown', { place: city || t('kyiv') });
}

async function loadMap() {
  try {
    mapData.value = await announcements.map({ lat: mapCenter.value.lat, lng: mapCenter.value.lng, radius: mapRadius.value, type: listType.value });
    mapError.value = '';
  } catch (error) {
    mapError.value = errorText(toApiError(error), 'errors.LIST_UNAVAILABLE');
  }
}

function stopMapRefresh() {
  clearInterval(mapTimer);
  mapTimer = undefined;
}

async function switchView(next: 'list' | 'map') {
  if (view.value === next) return;
  view.value = next;
  locationNote.value = '';
  stopMapRefresh();
  if (next === 'map') {
    // the map always searches in a circle: "any distance" of the list becomes the default radius.
    if (radius.value === null) radius.value = MAP_DEFAULT_RADIUS;
    await ensurePosition();
    await loadMap();
    mapTimer = setInterval(loadMap, MAP_REFRESH_MS);
  } else {
    await load(true);
  }
}

async function chooseRadius(next: SearchRadiusKm | null) {
  locationNote.value = '';
  if (next) {
    await ensurePosition();
    if (!position.value && view.value === 'list') {
      locationNote.value = t('nearest_needs_location');
      return;
    }
    if (view.value === 'list') sort.value = 'nearest';
  }
  if (view.value === 'map') await loadMap();
  else await load(true);
}

/** A click on the map moves the center of the search there. */
async function changeCenter(point: { lat: number; lng: number }) {
  position.value = point;
  locationNote.value = '';
  await loadMap();
}

async function mapUnavailable() {
  await switchView('list');
  locationNote.value = t('map_unavailable');
}

// Watchers
watch(listType, () => (view.value === 'map' ? void loadMap() : void load(true)));

// Lifecycle
onMounted(async () => {
  if (isAuthenticated.value) useProfileCity();
  await load(true);
});
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting) && hasMore.value && !loading.value && loadedOnce.value && !loadError.value) {
        void load(false);
      }
    },
    { rootMargin: '200px' }
  );
  watch(
    sentinel,
    (element, previous) => {
      if (previous) observer?.unobserve(previous);
      if (element) observer?.observe(element);
    },
    { immediate: true }
  );
});
onBeforeUnmount(() => {
  resetQueued = false;
  observer?.disconnect();
  stopMapRefresh();
});
</script>
