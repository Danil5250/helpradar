<template>
  <div class="flex justify-center items-center h-[60vh]" role="status" :aria-label="t('loading')">
    <svg viewBox="0 0 100 100" class="h-24 w-24" aria-hidden="true">
      <circle cx="50" cy="50" r="44" fill="none" stroke="#4A5D23" stroke-width="3" opacity=".35" />
      <circle cx="50" cy="50" r="26" fill="none" stroke="#4A5D23" stroke-width="3" opacity=".55" />
      <g class="radar-sweep">
        <path d="M50 50 L50 6 A44 44 0 0 1 88 28 Z" fill="#4A5D23" opacity=".25" />
        <line x1="50" y1="50" x2="50" y2="6" stroke="#4A5D23" stroke-width="3" stroke-linecap="round" />
      </g>
      <circle cx="50" cy="50" r="5" fill="#FF8C00" />
    </svg>
  </div>
</template>

<script setup lang="ts">
// Utils
const { t } = useI18n();
</script>
