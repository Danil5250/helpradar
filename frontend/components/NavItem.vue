<template>
  <NuxtLink :to="to" class="relative flex flex-col items-start">
    <span class="xl:text-pl md:text-pxl sm:text-ps cursor-pointer hover:text-forest" :class="route.path === to ? 'font-bold text-forest' : 'text-charcoal'">
      <div class="my-2">{{ text }}</div>
    </span>
    <div
      v-if="!isLast"
      class="xl:mt-0 md:mt-3 md:w-[90%] md:border-b sm:mt-0 sm:w-[100%] sm:border-b xl:border-0 md:border-sand-dark sm:border-sand-dark"
    />
    <span
      v-if="route.path === to"
      class="xl:absolute md:hidden xl:bottom-[-8px] xl:left-0 xl:w-full xl:h-1 xl:bg-radar xl:rounded-full xl:transition-all xl:duration-300 xl:ease-in-out"
    />
  </NuxtLink>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ text?: string; to: string; isLast?: boolean }>(), { text: '', isLast: false });
const route = useRoute();
</script>
