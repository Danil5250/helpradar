<template>
  <span class="inline-flex items-center gap-1" :aria-label="t('rating_value', { value: value.toFixed(1) })" role="img">
    <span v-for="star in 5" :key="star" aria-hidden="true" :class="star <= Math.round(value) ? 'text-radar' : 'text-sand-dark'">★</span>
    <span v-if="showValue" class="ml-1 font-montserratMedium text-charcoal">{{ value.toFixed(1) }}</span>
  </span>
</template>

<script setup lang="ts">
// Props
withDefaults(defineProps<{ value: number; showValue?: boolean }>(), { showValue: true });

// Utils
const { t } = useI18n();
</script>
