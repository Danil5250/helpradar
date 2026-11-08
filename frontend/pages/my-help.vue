<template>
  <div class="max-w-screen-lg mx-auto px-4 mt-[2vh]">
    <header class="bg-almost-white rounded-3xl p-6 md:p-8 mb-7">
      <p class="uppercase tracking-widest text-xs text-sage mb-3">HelpRadar · {{ t('help.together') }}</p>
      <h1 class="font-kharkiv text-h3 md:text-h2 mb-3">{{ t('help.my_help') }}</h1>
      <p class="text-sage leading-relaxed max-w-2xl">{{ t(role === 'volunteer' ? 'help.volunteer_intro' : 'help.requester_intro') }}</p>
      <div class="grid grid-cols-3 gap-3 mt-6">
        <div v-for="tab in countedTabs" :key="tab.key" class="rounded-2xl p-3 md:p-4" :class="tab.key === 'active' ? 'bg-radar/10' : 'bg-sand/50'">
          <p class="font-kharkiv text-2xl md:text-3xl">{{ tab.count }}</p>
          <p class="text-xs md:text-sm text-sage mt-1">{{ t(`help.filter.${tab.key}`) }}</p>
        </div>
      </div>
    </header>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div class="flex flex-wrap gap-2" role="group" :aria-label="t('help.filter_label')">
        <button
          v-for="tab in tabs"
          :key="tab"
          type="button"
          class="rounded-full px-4 py-2 text-sm font-montserratMedium border-2 border-forest"
          :class="filter === tab ? 'bg-forest text-almost-white' : 'text-forest'"
          :aria-pressed="filter === tab"
          @click="filter = tab"
        >
          {{ t(`help.filter.${tab}`) }}
        </button>
      </div>
    </div>
    <LoadingSpinner v-if="loading && !loaded" />
    <p v-if="error" class="border-l-4 border-radar bg-almost-white px-4 py-3 rounded-r-xl mb-5" role="alert">{{ error }}</p>
    <div v-if="visible.length" class="grid grid-cols-1 md:grid-cols-2 gap-5" data-test="my-help-list">
      <HelpConnectionCard v-for="connection in visible" :key="connection.id" :connection="connection" @updated="load" />
    </div>
    <div v-else-if="loaded && !error" class="bg-almost-white rounded-3xl px-6 py-12 text-center">
      <span class="grid place-items-center w-14 h-14 rounded-full bg-sand mx-auto mb-4"><AppIcon name="user" class="w-7 h-7 text-forest" /></span>
      <h2 class="font-kharkiv text-h5 mb-3">{{ t('help.empty_title') }}</h2>
      <p class="text-sage mb-6 max-w-lg mx-auto">{{ t('help.empty_hint') }}</p>
      <NuxtLink to="/main"
        ><AppButton is-filled>{{ t('back_to_list') }}</AppButton></NuxtLink
      >
    </div>
  </div>
</template>

<script setup lang="ts">
// Imports
import type { HelpConnection } from '~/types/help';

// Composables
const { role } = useAuth();
const help = useHelp();

// Utils
const { t } = useI18n();
const errorText = useApiErrorText();
definePageMeta({ middleware: 'auth' });
useHead({ title: computed(() => `${t('help.my_help')} - HelpRadar`) });

// Data
const items = ref<HelpConnection[]>([]);
const filter = ref<'all' | 'pending' | 'active' | 'completed' | 'rejected'>('all');
const loading = ref(false);
const loaded = ref(false);
const error = ref('');
let timer: ReturnType<typeof setInterval> | undefined;

// Constants
const tabs = ['all', 'pending', 'active', 'completed', 'rejected'] as const;
const summaryTabs = ['pending', 'active', 'completed'] as const;

// Computed
const visible = computed(() => items.value.filter((item) => matches(item, filter.value)));
const countedTabs = computed(() => summaryTabs.map((key) => ({ key, count: items.value.filter((item) => matches(item, key)).length })));

// Methods
function matches(connection: HelpConnection, tab: string) {
  if (tab === 'all') return true;
  if (tab === 'rejected') return connection.status === 'Rejected';
  if (tab === 'pending') return connection.status === 'Pending' && connection.request.status === 'Active';
  return connection.status === 'Accepted' && connection.request.status === (tab === 'active' ? 'InProgress' : 'Completed');
}
async function load() {
  if (loading.value) return;
  loading.value = true;
  error.value = '';
  try {
    items.value = await help.mine();
    loaded.value = true;
  } catch (failure) {
    error.value = errorText(toApiError(failure));
  } finally {
    loading.value = false;
  }
}

// Lifecycle
onMounted(() => {
  void load();
  timer = setInterval(() => {
    if (!document.hidden) void load();
  }, 15000);
});
onBeforeUnmount(() => clearInterval(timer));
</script>
