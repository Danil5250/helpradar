<template>
  <div class="flex justify-center items-center min-h-[60vh]">
    <div class="flex flex-col sm:items-center md:items-start xl:items-start sm:space-y-1 md:space-y-4 xl:space-y-4">
      <img :src="notFound404" alt="" class="w-[100%] h-[100%] px-10 sm:block xl:hidden md:hidden not-found-art" />
      <h1 class="xl:text-6xl md:text-6xl sm:text-h3 font-kharkiv">{{ t('not_found_title') }}</h1>
      <h2 class="xl:text-2xl md:text-2xl font-montserratMedium">{{ t('not_found_subtitle') }}</h2>
      <p class="xl:text-lg sm:text-xs-pl md:text-lg max-w-xs font-montserratRegular">{{ t('not_found_text') }}</p>
      <NuxtLink to="/main">
        <AppButton is-filled class="uppercase mt-4">{{ t('to_main') }}</AppButton>
      </NuxtLink>
    </div>
    <div class="ml-16 sm:hidden xl:block md:block">
      <img :src="notFound404" alt="" class="w-96 h-96 not-found-art" />
    </div>
  </div>
</template>

<script setup lang="ts">
// Imports
import notFound404 from '~/assets/images/NotFound404.svg';

// Utils
const { t } = useI18n();
useHead({ title: computed(() => t('helmet_not_found')), meta: [{ name: 'robots', content: 'noindex, nofollow' }] });
</script>

<style scoped>
.not-found-art {
  filter: hue-rotate(-135deg) saturate(0.75) brightness(0.9);
}
</style>
