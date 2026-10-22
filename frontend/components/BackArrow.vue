<template>
  <button type="button" class="ml-2 mt-10 cursor-pointer" :aria-label="t('back')" @click="emit('click')">
    <img :src="backArrow" alt="" class="sm:hidden md:block" />
    <img :src="backArrowMini" alt="" class="md:hidden" />
  </button>
</template>

<script setup lang="ts">
// Imports
import backArrow from '~/assets/images/Back.svg';
import backArrowMini from '~/assets/images/back_arrow_mini.svg';

// Emits
const emit = defineEmits<{ click: [] }>();

// Utils
const { t } = useI18n();
</script>
