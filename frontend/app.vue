<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const { locale } = useI18n();

useHead({
  htmlAttrs: { lang: locale },
  titleTemplate: (title) => title || 'HelpRadar',
});
</script>
