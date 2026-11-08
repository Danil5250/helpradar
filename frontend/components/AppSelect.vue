<template>
  <div ref="root" class="relative min-w-0 max-w-full" :class="[fullWidth ? 'w-full' : 'w-full md:w-auto', { 'z-30': menuVisible }]" @focusout="onFocusOut">
    <div v-if="searchable" class="flex min-w-0 items-center border-2 bg-almost-white text-charcoal transition focus-within:ring-2 focus-within:ring-olive/40" :class="[shape, invalid ? 'border-radar' : 'border-forest', { 'opacity-60': disabled }]">
      <input
        :id="controlId"
        ref="control"
        :value="model ?? ''"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        :aria-label="label"
        :aria-controls="listId"
        :aria-expanded="menuVisible"
        :aria-activedescendant="activeId"
        :aria-invalid="invalid || undefined"
        :aria-describedby="describedBy"
        :disabled="disabled"
        :maxlength="maxlength"
        :placeholder="placeholder"
        :data-test="dataTest"
        class="min-w-0 w-full bg-transparent rounded-full py-2 pl-5 pr-2 outline-none font-montserratMedium text-base md:text-pxl xl:text-pl disabled:cursor-not-allowed"
        @input="search"
        @focus="openMenu()"
        @keydown="onKeydown"
      />
      <button type="button" tabindex="-1" :disabled="disabled" :aria-label="t('select_options')" class="shrink-0 py-3 pl-2 pr-5 text-forest disabled:cursor-not-allowed" @click="toggle">
        <AppIcon name="chevron-down" class="h-4 w-4 transition-transform duration-200" :class="{ 'rotate-180': menuVisible }" />
      </button>
    </div>
    <button
      v-else
      :id="controlId"
      ref="control"
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      :aria-label="label ?? (id ? undefined : displayLabel)"
      :aria-controls="listId"
      :aria-expanded="menuVisible"
      :aria-activedescendant="activeId"
      :aria-invalid="invalid || undefined"
      :aria-describedby="describedBy"
      :disabled="disabled"
      :data-test="dataTest"
      class="flex w-full min-w-0 items-center justify-between gap-3 border-2 px-5 py-2 text-forest font-montserratMedium text-base md:text-pxl xl:text-pl transition hover:border-olive hover:ring-2 hover:ring-olive/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/40 disabled:opacity-60 disabled:cursor-not-allowed"
      :class="[shape, invalid ? 'border-radar' : 'border-forest']"
      @click="toggle"
      @keydown="onKeydown"
    >
      <span class="inline-grid min-w-0 text-left">
        <span class="col-start-1 row-start-1 truncate" :title="displayLabel">{{ displayLabel }}</span>
        <span v-for="(option, index) in options" :key="index" class="col-start-1 row-start-1 invisible truncate" aria-hidden="true">{{ prefix ? `${prefix}: ${option.label}` : option.label }}</span>
      </span>
      <AppIcon name="chevron-down" class="h-4 w-4 shrink-0 transition-transform duration-200" :class="{ 'rotate-180': menuVisible }" />
    </button>
    <ul
      v-if="menuVisible"
      :id="listId"
      ref="list"
      role="listbox"
      :aria-label="label ?? prefix"
      class="absolute left-0 w-full overflow-y-auto overscroll-contain border-2 border-forest bg-almost-white shadow-sm"
      :class="above ? 'bottom-full -mb-0.5 rounded-t-3xl' : 'top-full -mt-0.5 rounded-b-3xl'"
      :style="{ maxHeight: `${menuHeight}px` }"
    >
      <li
        v-for="(option, index) in options"
        :id="`${listId}-${index}`"
        :key="`${String(option.value)}-${index}`"
        role="option"
        :aria-selected="model === option.value"
        class="cursor-pointer px-5 py-2.5 break-words text-base md:text-pxl xl:text-pl"
        :class="[model === option.value ? 'font-bold text-forest' : 'text-charcoal', { 'bg-sand': activeIndex === index }]"
        :data-test="dataTest ? `${dataTest}-${option.value}` : undefined"
        @pointermove="activeIndex = index"
        @mousedown.prevent
        @click="choose(index)"
      >{{ option.label }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts" generic="T extends string | number | null">
// Props
const model = defineModel<T>({ required: true });
const props = withDefaults(
  defineProps<{
    options: { value: T; label: string }[];
    id?: string;
    label?: string;
    prefix?: string;
    placeholder?: string;
    dataTest?: string;
    describedBy?: string;
    maxlength?: number;
    searchable?: boolean;
    fullWidth?: boolean;
    disabled?: boolean;
    invalid?: boolean;
  }>(),
  { searchable: false, fullWidth: false, disabled: false, invalid: false },
);

// Emits
const emit = defineEmits<{ change: [value: T]; search: [query: string] }>();

// Utils
const { t } = useI18n();
const generatedId = useId();

// Data
const root = ref<HTMLElement | null>(null);
const control = ref<HTMLElement | null>(null);
const list = ref<HTMLElement | null>(null);
const open = ref(false);
const above = ref(false);
const menuHeight = ref(288);
const activeIndex = ref(-1);
let typed = '';
let typedTimer: ReturnType<typeof setTimeout> | undefined;

// Computed
const controlId = computed(() => props.id ?? `select-${generatedId}`);
const listId = computed(() => `${controlId.value}-options`);
const menuVisible = computed(() => open.value && !props.disabled && props.options.length > 0);
const activeId = computed(() => (menuVisible.value && activeIndex.value >= 0 ? `${listId.value}-${activeIndex.value}` : undefined));
const selected = computed(() => props.options.find((option) => option.value === model.value));
const displayLabel = computed(() => {
  const text = selected.value?.label ?? props.placeholder ?? '';
  return props.prefix ? `${props.prefix}: ${text}` : text;
});
const shape = computed(() =>
  !menuVisible.value ? 'rounded-full' : above.value ? 'rounded-b-3xl rounded-t-none' : 'rounded-t-3xl rounded-b-none',
);

// Methods
function positionMenu() {
  if (!root.value) return;
  const rect = root.value.getBoundingClientRect();
  const below = window.innerHeight - rect.bottom - 12;
  const availableAbove = rect.top - 12;
  above.value = below < 200 && availableAbove > below;
  menuHeight.value = Math.max(48, Math.min(288, above.value ? availableAbove : below));
}

function openMenu() {
  if (props.disabled) return;
  positionMenu();
  open.value = true;
  activeIndex.value = -1;
}

function closeMenu() {
  open.value = false;
  activeIndex.value = -1;
}
function toggle() {
  if (props.disabled) return;
  if (menuVisible.value) closeMenu();
  else {
    openMenu();
    control.value?.focus();
  }
}

function choose(index: number) {
  const option = props.options[index];
  if (!option || props.disabled) return;
  const changed = model.value !== option.value;
  model.value = option.value;
  control.value?.focus();
  closeMenu();
  if (changed || props.searchable) emit('change', option.value);
}

function search(event: Event) {
  const query = (event.target as HTMLInputElement).value;
  model.value = query as T;
  activeIndex.value = -1;
  positionMenu();
  open.value = true;
  emit('search', query);
}

function move(index: number) {
  activeIndex.value = index;
  void nextTick(() => list.value?.querySelectorAll('[role="option"]')[index]?.scrollIntoView({ block: 'nearest' }));
}

function onKeydown(event: KeyboardEvent) {
  if (props.disabled) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeMenu();
    return;
  }
  if (event.key === 'Tab') {
    closeMenu();
    return;
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (!open.value) openMenu();
    if (!props.options.length) return;
    const next =
      activeIndex.value < 0
        ? event.key === 'ArrowDown'
          ? 0
          : props.options.length - 1
        : activeIndex.value + (event.key === 'ArrowDown' ? 1 : -1);
    move((next + props.options.length) % props.options.length);
  } else if ((event.key === 'Enter' || (!props.searchable && event.key === ' ')) && menuVisible.value) {
    if (activeIndex.value >= 0) {
      event.preventDefault();
      choose(activeIndex.value);
    }
  } else if (!props.searchable && (event.key === 'Home' || event.key === 'End')) {
    event.preventDefault();
    if (!open.value) openMenu();
    if (props.options.length) move(event.key === 'Home' ? 0 : props.options.length - 1);
  } else if (!props.searchable && event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    if (!open.value) openMenu();
    typed += event.key.toLocaleLowerCase();
    clearTimeout(typedTimer);
    typedTimer = setTimeout(() => (typed = ''), 600);
    const index = props.options.findIndex((option) => option.label.toLocaleLowerCase().startsWith(typed));
    if (index >= 0) move(index);
  }
}

function outside(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) closeMenu();
}
function onFocusOut(event: FocusEvent) {
  if (!root.value?.contains(event.relatedTarget as Node | null)) closeMenu();
}

// Watchers
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) closeMenu();
  },
);
watch(
  () => props.options,
  () => {
    if (open.value) {
      positionMenu();
      activeIndex.value = -1;
    }
  },
);

// Lifecycle
onMounted(() => {
  document.addEventListener('pointerdown', outside);
  window.addEventListener('resize', positionMenu);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', outside);
  window.removeEventListener('resize', positionMenu);
  clearTimeout(typedTimer);
});
</script>
