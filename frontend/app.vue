<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
// Utils
const { locale } = useI18n();
useHead({
  htmlAttrs: { lang: locale },
  titleTemplate: (title) => title || 'HelpRadar',
});
</script>
