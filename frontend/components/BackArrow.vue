<template>
  <button type="button" class="ml-2 mt-10 cursor-pointer" :aria-label="t('back')" @click="emit('click')">
    <img :src="backArrow" alt="" class="sm:hidden md:block" />
    <img :src="backArrowMini" alt="" class="md:hidden" />
  </button>
</template>

<script setup lang="ts">
import backArrow from '~/assets/images/Back.svg';
import backArrowMini from '~/assets/images/back_arrow_mini.svg';

const emit = defineEmits<{ click: [] }>();
const { t } = useI18n();
</script>
