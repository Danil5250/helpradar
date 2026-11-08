<template>
  <div class="w-full flex flex-col mb-4">
    <label for="location-address" class="font-montserratRegular mb-2">{{ t('place') }}*</label>

    <div class="flex flex-col xl:flex-row gap-2 mb-2">
      <div class="relative flex-1">
        <AppSelect
          id="location-address"
          v-model="model.address"
          :options="addressOptions"
          searchable
          full-width
          :maxlength="255"
          :placeholder="t('address_placeholder')"
          :invalid="!!error"
          described-by="location-error"
          data-test="address"
          @search="onAddressInput"
          @change="selectAddress"
        />
      </div>
      <AppButton has-outline :loading="locating" data-test="use-location" @click="useMyLocation()">
        <AppIcon name="crosshair" class="inline mr-1" />{{ t('use_my_location') }}
      </AppButton>
    </div>

    <p v-if="searchError" class="text-sm mb-2 border-l-4 border-radar pl-2 text-charcoal" role="status">{{ searchError }}</p>
    <p v-if="locationHint" class="text-sm mb-2 border-l-4 border-sage pl-2 text-charcoal" role="status">{{ locationHint }}</p>

    <div ref="mapElement" class="h-72 w-full rounded-2xl border-2 border-sage z-0" role="application" :aria-label="t('map_pick_hint')" data-test="map" />
    <p class="text-sm mt-2 text-sage">{{ t('map_pick_hint') }}</p>
    <p v-if="model.latitude !== null && model.longitude !== null" class="text-sm mt-1" data-test="coordinates">
      {{ t('selected_point') }}: {{ model.latitude.toFixed(5) }}, {{ model.longitude.toFixed(5) }}
    </p>
    <p class="text-sm mt-1 text-sage">{{ t('privacy_300m') }}</p>
    <FieldError id="location-error" :text="fieldText(error)" />
  </div>
</template>

<script setup lang="ts">
// Imports
import type { Map as LeafletMap, Marker } from 'leaflet';
import type { LocationValue, PlaceSuggestion } from '~/types/announcement';

// Props
const model = defineModel<LocationValue>({ required: true });
const props = withDefaults(defineProps<{ error?: string; autoLocate?: boolean }>(), { error: undefined, autoLocate: false });

// Composables
const announcements = useAnnouncements();

// Utils
const { t } = useI18n();
const config = useRuntimeConfig();
const errorText = useApiErrorText();
const fieldText = useFieldErrorText();

// Data
const mapElement = ref<HTMLElement | null>(null);
const suggestions = ref<PlaceSuggestion[]>([]);
const searchError = ref('');
const locating = ref(false);
const locationHint = ref('');

// Constants
let leaflet: typeof import('leaflet') | null = null;
let map: LeafletMap | null = null;
let marker: Marker | null = null;
let searchTimer: ReturnType<typeof setTimeout> | undefined;
let searchToken = 0;
const UKRAINE_CENTER: [number, number] = [48.38, 31.17];
const pin = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40"><path d="M16 1C8 1 2 7 2 15c0 10 14 24 14 24s14-14 14-24C30 7 24 1 16 1z" fill="#FF8C00" stroke="#1A2421" stroke-width="2"/><circle cx="16" cy="15" r="5.5" fill="#1A2421"/></svg>`;

// Computed
const addressOptions = computed(() => suggestions.value.map((place) => ({ value: place.label, label: place.label })));

// Methods
function placeMarker(latitude: number, longitude: number, fly: boolean) {
  if (!leaflet || !map) return;
  if (!marker) {
    marker = leaflet
      .marker([latitude, longitude], {
        draggable: true,
        keyboard: true,
        title: t('location_marker'),
        icon: leaflet.divIcon({ className: '', html: pin, iconSize: [32, 40], iconAnchor: [16, 40] }),
      })
      .addTo(map);
    marker.on('dragend', () => {
      const { lat, lng } = marker!.getLatLng();
      setPoint(lat, lng, { reverse: true });
    });
  } else {
    marker.setLatLng([latitude, longitude]);
  }
  if (fly) map.setView([latitude, longitude], Math.max(map.getZoom(), 15));
}

async function setPoint(latitude: number, longitude: number, options: { fly?: boolean; reverse?: boolean } = {}) {
  const lat = Math.round(latitude * 1e6) / 1e6;
  const lng = Math.round(longitude * 1e6) / 1e6;
  model.value = { ...model.value, latitude: lat, longitude: lng };
  placeMarker(lat, lng, options.fly ?? false);
  if (options.reverse) {
    const place = await announcements.reverseGeocode(lat, lng).catch(() => null);
    if (place && model.value.latitude === lat && model.value.longitude === lng) {
      model.value = { ...model.value, address: place.label.slice(0, 255) };
    }
  }
}

function useMyLocation(silent = false) {
  locationHint.value = '';
  if (!('geolocation' in navigator)) {
    if (!silent) locationHint.value = t('location_denied');
    return;
  }
  locating.value = true;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      locating.value = false;
      void setPoint(position.coords.latitude, position.coords.longitude, { fly: true, reverse: true });
    },
    () => {
      locating.value = false;
      locationHint.value = t('location_denied');
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
  );
}

function onAddressInput() {
  if (model.value.latitude !== null) {
    model.value = { ...model.value, latitude: null, longitude: null };
    if (marker) {
      marker.remove();
      marker = null;
    }
  }
  searchError.value = '';
  if (searchTimer) clearTimeout(searchTimer);
  const query = model.value.address.trim();
  if (query.length < 3) {
    suggestions.value = [];
    return;
  }
  searchTimer = setTimeout(async () => {
    const token = ++searchToken;
    try {
      const items = await announcements.searchAddress(query);
      if (token !== searchToken) return;
      suggestions.value = items;
    } catch (error) {
      if (token !== searchToken) return;
      suggestions.value = [];
      searchError.value = errorText(toApiError(error), 'errors.GEOCODER_UNAVAILABLE');
    }
  }, 300);
}

function selectSuggestion(place: PlaceSuggestion) {
  suggestions.value = [];
  model.value = { ...model.value, address: place.label.slice(0, 255) };
  void setPoint(place.latitude, place.longitude, { fly: true });
}

function selectAddress(address: string) {
  const place = suggestions.value.find((suggestion) => suggestion.label === address);
  if (place) selectSuggestion(place);
}

// Watchers
watch(
  () => [model.value.latitude, model.value.longitude] as const,
  ([latitude, longitude]) => {
    if (latitude === null || longitude === null) return;
    const current = marker?.getLatLng();
    if (!current || Math.abs(current.lat - latitude) > 1e-7 || Math.abs(current.lng - longitude) > 1e-7) {
      placeMarker(latitude, longitude, true);
    }
  }
);

// Lifecycle
onMounted(async () => {
  const imported = await import('leaflet');
  leaflet = (imported as any).default ?? imported;
  if (!mapElement.value || !leaflet) return;

  const { latitude, longitude } = model.value;
  const hasPoint = latitude !== null && longitude !== null;
  map = leaflet.map(mapElement.value, { scrollWheelZoom: false }).setView(hasPoint ? [latitude, longitude] : UKRAINE_CENTER, hasPoint ? 15 : 6);
  leaflet.tileLayer(config.public.mapTileUrl, { attribution: config.public.mapAttribution, maxZoom: 19 }).addTo(map);
  map.on('click', (event) => void setPoint(event.latlng.lat, event.latlng.lng, { reverse: true }));
  if (hasPoint) placeMarker(latitude, longitude, false);
  else if (props.autoLocate) useMyLocation(true);
});
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
  map?.remove();
  map = null;
  marker = null;
});
</script>
