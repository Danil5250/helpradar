<template>
  <div class="relative w-full md:w-auto">
    <AppButton has-outline class="px-2 w-full md:w-auto flex items-center justify-center space-x-3" :class="open ? '!rounded-b-none !rounded-t-3xl' : 'rounded-3xl'" aria-haspopup="listbox" :aria-expanded="open" :data-test="dataTest" @click="open = !open">
      <span class="font-montserratMedium inline-grid items-center text-center">
        <span class="col-start-1 row-start-1">{{ prefix }}: {{ selected?.label }}</span>
        <span v-for="option in options" :key="String(option.value)" class="col-start-1 row-start-1 invisible" aria-hidden="true">{{ prefix }}: {{ option.label }}</span>
      </span>
      <AppIcon name="chevron-down" class="h-4 w-4 transition-transform duration-300" :class="{ 'rotate-180': open }" />
    </AppButton>
    <ul v-if="open" role="listbox" class="w-full min-w-[14rem] bg-almost-white border-2 border-forest rounded-b-3xl absolute left-0 top-full z-20 -mt-1 overflow-hidden">
      <li
        v-for="option in options"
        :key="String(option.value)"
        role="option"
        tabindex="0"
        :aria-selected="model === option.value"
        class="cursor-pointer py-2 px-4 hover:bg-sand"
        :class="model === option.value ? 'font-bold text-forest' : 'text-charcoal'"
        :data-test="`${dataTest}-${option.value}`"
        @click="choose(option.value)"
        @keydown.enter="choose(option.value)"
      >
        {{ option.label }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts" generic="T extends string | number | null">
// Props
const model = defineModel<T>({ required: true });
const props = defineProps<{ options: { value: T; label: string }[]; prefix: string; dataTest?: string }>();

// Emits
const emit = defineEmits<{ change: [value: T] }>();

// Data
const open = ref(false);

// Computed
const selected = computed(() => props.options.find((option) => option.value === model.value));

// Methods
function choose(value: T) {
  open.value = false;
  if (value === model.value) return;
  model.value = value;
  emit('change', value);
}
</script>
