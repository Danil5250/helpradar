<template>
  <div class="fixed top-24 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none" aria-live="polite" role="status">
    <div
      v-if="message"
      :key="message.id"
      class="pointer-events-auto flex items-center gap-3 max-w-xl w-full rounded-2xl border-l-8 shadow-lg px-5 py-3 text-charcoal"
      :class="look"
    >
      <AppIcon :name="message.kind === 'alert' ? 'alert' : 'check'" :class="message.kind === 'alert' ? 'text-radar' : message.kind === 'info' ? 'text-sage' : 'text-forest'" />
      <p class="flex-1 font-montserratMedium">{{ message.text }}</p>
      <button type="button" class="text-charcoal hover:text-forest" :aria-label="t('close')" @click="clear">
        <AppIcon name="close" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { message, clear } = useFlash();
const { t } = useI18n();

let timer: ReturnType<typeof setTimeout> | undefined;
watch(
  message,
  (current) => {
    if (timer) clearTimeout(timer);
    if (current) timer = setTimeout(clear, 7000);
  },
  { immediate: true },
);
onBeforeUnmount(() => timer && clearTimeout(timer));

const look = computed(() => {
  switch (message.value?.kind) {
    case 'alert':
      return 'border-radar bg-almost-white';
    case 'info':
      return 'border-sage bg-almost-white';
    default:
      return 'border-olive bg-almost-white';
  }
});
</script>
