<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    :class="looks"
    @click="emit('click', $event)"
  >
    <span v-if="loading" class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px] mr-2" aria-hidden="true" />
    <slot />
  </button>
</template>

<script setup lang="ts">
// Props
const props = withDefaults(
  defineProps<{
    hasBorder?: boolean;
    hasOutline?: boolean;
    isFilled?: boolean;
    type?: 'button' | 'submit';
    disabled?: boolean;
    loading?: boolean;
  }>(),
  { hasBorder: false, hasOutline: false, isFilled: false, type: 'button', disabled: false, loading: false },
);

// Emits
const emit = defineEmits<{ click: [event: MouseEvent] }>();

// Computed
const looks = computed(() => {
  const classes = ['text-charcoal', 'xl:text-pl', 'px-5', 'py-2', 'transition', 'disabled:opacity-60', 'disabled:cursor-not-allowed'];
  if (props.hasBorder) {
    classes.push('border-2 px-6 border-almost-white rounded-full text-almost-white md:text-pxl hover:border-olive');
  }
  if (props.hasOutline) {
    classes.push('border-2 px-6 border-forest rounded-full text-forest md:text-pxl hover:border-olive hover:ring-2 hover:ring-olive/40');
  }
  if (props.isFilled) {
    classes.push('bg-radar rounded-full py-2 xl:text-base xl:px-6 md:px-4 md:text-pxl font-bold hover:brightness-95 hover:ring-2 hover:ring-olive');
  }
  return classes;
});
</script>
