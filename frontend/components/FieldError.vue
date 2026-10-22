<template>
  <p v-if="text" :id="id" data-field-error class="text-charcoal text-sm mt-1 border-l-4 border-radar pl-2" role="alert">{{ text }}</p>
</template>

<script setup lang="ts">
defineProps<{ id?: string; text?: string }>();
</script>
