<template>
  <div class="relative">
    <div
      ref="element"
      class="h-[60vh] min-h-[22rem] w-full rounded-3xl border-2 border-sage z-0"
      role="application"
      :aria-label="t('map_label')"
      data-test="announcements-map"
    />
    <p class="text-sm mt-2 text-sage">{{ t('map_click_hint') }}</p>
  </div>
</template>

<script setup lang="ts">
// Imports
import type { MapMarker } from '~/types/announcement';

// Props
const props = defineProps<{ center: { lat: number; lng: number }; radiusKm: number; markers: MapMarker[] }>();

// Emits
const emit = defineEmits<{ centerChange: [point: { lat: number; lng: number }]; unavailable: [] }>();

// Utils
const { t, locale } = useI18n();
const config = useRuntimeConfig();

// Data
const element = ref<HTMLElement | null>(null);

// Constants
const CLUSTER_CELL_PX = 60;
const TILE_ERRORS_BEFORE_FALLBACK = 6;
let L: typeof import('leaflet') | null = null;
let map: import('leaflet').Map | null = null;
let circle: import('leaflet').Circle | null = null;
let centerMarker: import('leaflet').CircleMarker | null = null;
let markerLayer: import('leaflet').LayerGroup | null = null;

// Methods
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function cardHtml(marker: MapMarker): string {
  const type = t(marker.type === 'HelpRequest' ? 'help_request' : 'help_offer');
  return `<div class="font-montserratRegular min-w-[12rem]">
    <p class="text-xs text-sage">${escapeHtml(type)}${marker.isUrgent ? ` · <b class="text-radar">${escapeHtml(t('urgent'))}</b>` : ''}</p>
    <p class="font-montserratMedium text-base my-1 break-words">${escapeHtml(marker.title)}</p>
    <p class="text-sm text-sage">${escapeHtml(t(`category.${marker.category.id}`, marker.category.name))}</p>
    <p class="text-sm mt-1">${escapeHtml(formatDistance(marker.distanceKm))} · ${escapeHtml(timeAgo(marker.datePosted, locale.value))}</p>
    <button type="button" data-announcement="${marker.id}" class="mt-2 bg-radar text-charcoal font-bold rounded-full px-4 py-1 uppercase text-sm">${escapeHtml(t('more_details'))}</button>
  </div>`;
}

function drawMarkers() {
  if (!L || !map || !markerLayer) return;
  markerLayer.clearLayers();
  const cells = new Map<string, MapMarker[]>();
  for (const marker of props.markers) {
    const point = map.latLngToContainerPoint([marker.approxLocation.latitude, marker.approxLocation.longitude]);
    const key = `${Math.floor(point.x / CLUSTER_CELL_PX)}:${Math.floor(point.y / CLUSTER_CELL_PX)}`;
    cells.set(key, [...(cells.get(key) ?? []), marker]);
  }
  for (const group of cells.values()) {
    if (group.length === 1) {
      const [marker] = group;
      L.circleMarker([marker.approxLocation.latitude, marker.approxLocation.longitude], {
        radius: 10,
        color: '#1A2421',
        weight: 2,
        fillColor: marker.type === 'HelpRequest' ? (marker.isUrgent ? '#FF8C00' : '#4A5D23') : '#5B7065',
        fillOpacity: 1,
      })
        .bindPopup(cardHtml(marker))
        .addTo(markerLayer);
      continue;
    }
    const lat = group.reduce((sum, item) => sum + item.approxLocation.latitude, 0) / group.length;
    const lng = group.reduce((sum, item) => sum + item.approxLocation.longitude, 0) / group.length;
    const size = group.length < 10 ? 36 : group.length < 100 ? 44 : 52;
    L.marker([lat, lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px" class="rounded-full bg-forest text-almost-white font-bold flex items-center justify-center border-4 border-almost-white shadow">${group.length}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      }),
      title: t('map_cluster', { count: group.length }),
    })
      .on('click', () => map?.setView([lat, lng], Math.min((map?.getZoom() ?? 10) + 2, 18)))
      .addTo(markerLayer);
  }
}

function drawCircle(fit: boolean) {
  if (!L || !map) return;
  const center: [number, number] = [props.center.lat, props.center.lng];
  circle?.remove();
  centerMarker?.remove();
  circle = L.circle(center, { radius: props.radiusKm * 1000, color: '#4A5D23', weight: 2, fillColor: '#4A5D23', fillOpacity: 0.08, interactive: false }).addTo(
    map
  );
  centerMarker = L.circleMarker(center, { radius: 7, color: '#ffffff', weight: 3, fillColor: '#1A2421', fillOpacity: 1 })
    .bindTooltip(t('search_center'))
    .addTo(map);
  if (fit) map.fitBounds(circle.getBounds().pad(0.05));
}

// Watchers
watch(() => props.markers, drawMarkers);
watch(
  () => [props.center.lat, props.center.lng, props.radiusKm],
  () => drawCircle(true)
);

// Lifecycle
onMounted(async () => {
  try {
    const imported = await import('leaflet');
    L = (imported as any).default ?? imported;
  } catch {
    emit('unavailable');
    return;
  }
  if (!element.value || !L) return;
  map = L.map(element.value).setView([props.center.lat, props.center.lng], 11);
  let tileErrors = 0;
  let tilesLoaded = false;
  L.tileLayer(config.public.mapTileUrl, { attribution: config.public.mapAttribution, maxZoom: 19 })
    .on('tileload', () => (tilesLoaded = true))
    .on('tileerror', () => {
      tileErrors += 1;
      if (!tilesLoaded && tileErrors >= TILE_ERRORS_BEFORE_FALLBACK) emit('unavailable');
    })
    .addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  map.on('zoomend', drawMarkers);
  map.on('click', (event: import('leaflet').LeafletMouseEvent) => emit('centerChange', { lat: event.latlng.lat, lng: event.latlng.lng }));
  map.on('popupopen', (event: import('leaflet').PopupEvent) => {
    const button = event.popup.getElement()?.querySelector<HTMLButtonElement>('[data-announcement]');
    button?.addEventListener('click', () => navigateTo(`/main/announcement/${button.dataset.announcement}`));
  });
  drawCircle(true);
  drawMarkers();
});
onBeforeUnmount(() => {
  map?.remove();
  map = null;
});
</script>
