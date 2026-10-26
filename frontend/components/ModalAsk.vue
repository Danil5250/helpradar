<template>
  <div v-if="isOpen" class="fixed inset-0 flex items-center justify-center z-50" @keydown.esc="emit('close')">
    <div class="fixed inset-0 bg-charcoal opacity-60" @click="emit('close')" />
    <div
      ref="dialog"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="modal-ask-title"
      aria-describedby="modal-ask-message"
      class="bg-almost-white rounded-3xl justify-center border-2 border-forest p-8 shadow-lg z-60 relative xl:w-[30%] md:w-[70%] sm:w-[95%] h-auto"
    >
      <h2 id="modal-ask-title" class="xl:text-relative-h4 md:text-relative-h2 sm:text-relative-h1 font-kharkiv mb-4 text-center">{{ title }}</h2>
      <p id="modal-ask-message" class="w-[85%] mx-auto text-center font-montserratRegular mb-6">{{ message }}</p>
      <div class="flex justify-center space-x-4">
        <AppButton has-outline class="bg-forest uppercase !text-almost-white xl:py-2 sm:py-1 xl:px-4 sm:px-2 min-w-[5rem] hover:bg-forest-dark" @click="emit('confirm')">{{ t('yes') }}</AppButton>
        <AppButton has-outline class="uppercase xl:py-2 sm:py-1 xl:px-4 sm:px-2 min-w-[5rem]" @click="emit('close')">{{ t('no') }}</AppButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Props
const props = defineProps<{ isOpen: boolean; title: string; message: string }>();

// Emits
const emit = defineEmits<{ confirm: []; close: [] }>();

// Utils
const { t } = useI18n();

// Data
const dialog = ref<HTMLElement | null>(null);

// Watchers
watch(
  () => props.isOpen,
  async (open) => {
    if (open) {
      await nextTick();
      dialog.value?.querySelector<HTMLElement>('button')?.focus();
    }
  },
);
</script>
