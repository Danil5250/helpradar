<template>
  <article class="bg-almost-white w-full rounded-3xl flex flex-col h-full overflow-hidden" :data-test="`card-${a.id}`">
    <img v-if="a.thumbnailUrl" :src="a.thumbnailUrl" alt="" class="h-40 w-full object-cover" loading="lazy" />

    <div class="flex items-center p-4 mb-2 mt-4 ml-4">
      <img src="/avatar-placeholder.svg" alt="" class="w-16 h-16 rounded-full object-cover mr-3" />
      <div>
        <h4 class="text-relative-h5 xl:text-pl font-montserratMedium">{{ a.author.name }}</h4>
        <span class="text-sm font-montserratMedium flex items-center gap-2">
          <span>{{ timeAgo(a.datePosted, locale) }}</span>
          <span v-if="a.author.rating !== null" class="text-charcoal" :title="t('rating')">★ {{ a.author.rating.toFixed(1) }}</span>
        </span>
      </div>
    </div>

    <div class="flex justify-end w-full items-end gap-2">
      <span v-if="a.isUrgent" class="bg-radar text-charcoal font-bold font-montserratMedium px-4 py-1 rounded-full text-sm mr-2" data-test="urgent">{{ t('urgent') }}</span>
      <span
        class="text-almost-white text-sm px-4 pr-5 pl-10 py-1 font-montserratRegular tracking-wide rounded-l-full"
        :class="a.type === 'HelpRequest' ? 'bg-forest' : 'bg-sage'"
      >
        {{ t(a.type === 'HelpRequest' ? 'help_request' : 'help_offer') }}
      </span>
    </div>

    <div class="p-4 ml-4 flex-1">
      <h3 class="font-montserratMedium text-lg mb-1 break-words">{{ a.title }}</h3>
      <p class="text-sm text-sage mb-2">{{ t(`category.${a.category.id}`, a.category.name) }}</p>
      <p class="mb-2 font-montserratMedium break-words">{{ a.excerpt }}</p>
      <p v-if="a.distanceKm !== null" class="text-sm flex items-center gap-1"><AppIcon name="pin" class="h-4 w-4 text-forest" />{{ formatDistance(a.distanceKm) }}</p>
      <p v-if="showStatus" class="mt-2">
        <span class="text-sm px-3 py-1 rounded-full font-montserratMedium" :class="statusLook[a.status]">{{ t(`status.${a.status}`) }}</span>
        <span class="text-sm ml-2 text-charcoal">{{ t('expires') }}: {{ formatDate(a.expiresAt, locale) }}</span>
      </p>
    </div>

    <div class="flex justify-center items-center font-montserratMedium ml-4 mb-4 p-4">
      <NuxtLink :to="`/main/announcement/${a.id}`">
        <AppButton is-filled class="uppercase px-4 py-2 rounded-full">{{ t('more_details') }}</AppButton>
      </NuxtLink>
    </div>
  </article>
</template>

<script setup lang="ts">
// Imports
import type { AnnouncementListItem, AnnouncementStatus } from '~/types/announcement';

// Props
const props = defineProps<{ announcement: AnnouncementListItem; showStatus?: boolean }>();

// Utils
const { t, locale } = useI18n();

// Constants
const statusLook: Record<AnnouncementStatus, string> = {
  Active: 'bg-olive text-charcoal',
  InProgress: 'bg-sage text-almost-white',
  Completed: 'bg-olive text-charcoal',
  Hidden: 'bg-sage text-almost-white',
  Closed: 'bg-sand-dark text-charcoal',
  Deleted: 'bg-sand-dark text-charcoal',
};

// Computed
const a = computed(() => props.announcement);
</script>
