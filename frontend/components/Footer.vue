<template>
  <footer class="mt-16 border-t-2 border-sand-dark bg-almost-white font-montserratRegular">
    <div class="px-8 md:px-12 xl:px-28 py-8 flex flex-col md:flex-row justify-between items-start gap-8 text-charcoal">
      <NuxtLink to="/main" :aria-label="t('main')"><HelpRadarLogo /></NuxtLink>
      <div>
        <h3 class="font-bold mb-2">{{ t('navigationUPPER') }}</h3>
        <ul>
          <li><NuxtLink to="/main" class="hover:underline">{{ t('advertisement') }}</NuxtLink></li>
          <li v-if="isAuthenticated"><NuxtLink to="/my-announcements" class="hover:underline">{{ t('my_announcements') }}</NuxtLink></li>
          <li v-if="isAuthenticated"><NuxtLink to="/add-announcement" class="hover:underline">{{ t('add_announcement') }}</NuxtLink></li>
        </ul>
      </div>
      <div class="max-w-xs">
        <h3 class="font-bold mb-2">{{ t('emergencyUPPER') }}</h3>
        <p>{{ t('call_112') }}</p>
        <a href="tel:112" class="font-bold text-forest hover:underline text-pxl">112</a>
      </div>

      <LanguageSelector />
    </div>
    <div class="px-8 md:px-12 xl:px-28 pb-6 text-xs text-charcoal">©{{ year }} HELPRADAR. All rights reserved</div>
  </footer>
</template>

<script setup lang="ts">
// Composables
const { isAuthenticated } = useAuth();

// Utils
const { t } = useI18n();

// Constants
const year = new Date().getFullYear();
</script>
