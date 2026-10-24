<template>
  <div>
    <div ref="element" class="h-56 w-full rounded-2xl border-2 border-sage z-0" role="img" :aria-label="exact ? t('exact_location') : t('approximate_area')" data-test="location-map" />
    <p class="text-sm mt-1 text-sage">{{ exact ? t('exact_location_hint') : t('approximate_area') }}</p>
  </div>
</template>

<script setup lang="ts">
import type { GeoPoint } from '~/types/announcement';

const props = defineProps<{ approx: GeoPoint; exact?: GeoPoint | null }>();
const { t } = useI18n();
const config = useRuntimeConfig();
const element = ref<HTMLElement | null>(null);
let map: import('leaflet').Map | null = null;

onMounted(async () => {
  const imported = await import('leaflet');
  const L: typeof import('leaflet') = (imported as any).default ?? imported;
  if (!element.value) return;
  map = L.map(element.value, { scrollWheelZoom: false }).setView([props.approx.latitude, props.approx.longitude], 14);
  L.tileLayer(config.public.mapTileUrl, { attribution: config.public.mapAttribution, maxZoom: 19 }).addTo(map);
  const circle = L.circle([props.approx.latitude, props.approx.longitude], {
    radius: 300,
    color: '#4A5D23',
    fillColor: '#4A5D23',
    fillOpacity: 0.2,
    weight: 2,
  }).addTo(map);
  if (props.exact) {
    L.circleMarker([props.exact.latitude, props.exact.longitude], { radius: 7, color: '#1A2421', fillColor: '#FF8C00', fillOpacity: 1, weight: 2 })
      .bindTooltip(t('exact_location'))
      .addTo(map);
  }
  map.fitBounds(circle.getBounds().pad(0.3));
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});
</script>
