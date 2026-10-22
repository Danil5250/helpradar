<template>
  <div class="flex items-center gap-2">
    <button type="button" class="rounded-sm" :class="locale === 'en' ? 'ring-2 ring-forest' : 'opacity-70 hover:opacity-100'" aria-label="English" :aria-pressed="locale === 'en'" @click="changeLanguage('en')">
      <img :src="engImg" alt="EN" class="h-6 w-auto" />
    </button>
    <button type="button" class="rounded-sm" :class="locale === 'uk' ? 'ring-2 ring-forest' : 'opacity-70 hover:opacity-100'" aria-label="Українська" :aria-pressed="locale === 'uk'" @click="changeLanguage('uk')">
      <img :src="ukrImg" alt="UA" class="h-6 w-auto" />
    </button>
  </div>
</template>

<script setup lang="ts">
// Imports
import engImg from '~/assets/images/eng_img.png';
import ukrImg from '~/assets/images/ukr_img.png';
import { LANGUAGE_KEY } from '~/plugins/i18n';

// Utils
const { locale } = useI18n();

// Methods
function changeLanguage(lng: 'uk' | 'en') {
  locale.value = lng;
  try {
    localStorage.setItem(LANGUAGE_KEY, lng);
  } catch {
  }
}
</script>
