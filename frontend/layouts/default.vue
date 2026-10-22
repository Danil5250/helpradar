<template>
  <div class="min-h-screen bg-sand flex flex-col">
    <a
      href="#content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-almost-white focus:text-charcoal focus:px-4 focus:py-2 focus:rounded-lg"
    >
      {{ t('skip_to_content') }}
    </a>
    <MainHeader />
    <FlashMessage />
    <main id="content" class="flex-1 pt-28 px-4 md:px-12 xl:px-28">
      <slot />
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
</script>
