<template>
  <section id="help" class="mt-10 rounded-3xl bg-almost-white p-5 md:p-8 scroll-mt-32" data-test="help-panel">
    <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-7">
      <div><p class="text-xs uppercase tracking-widest text-sage mb-2">HelpRadar · {{ t('help.together') }}</p><h2 class="font-kharkiv text-h5 md:text-h4">{{ t('help.panel_title') }}</h2></div>
      <NuxtLink v-if="isAuthenticated" to="/my-help" class="font-montserratMedium text-sm underline text-forest self-start">{{ t('help.my_help') }} →</NuxtLink>
    </div>
    <ol class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-7" :aria-label="t('help.steps_label')">
      <li v-for="(step, index) in steps" :key="step" class="flex items-center gap-3 rounded-2xl px-4 py-3" :class="index === currentStep ? 'bg-sand' : 'bg-sand/30'">
        <span class="w-8 h-8 shrink-0 rounded-full grid place-items-center text-sm font-bold" :class="index < currentStep ? 'bg-forest text-almost-white' : index === currentStep ? 'bg-radar text-charcoal' : 'bg-sand text-sage'">
          <AppIcon v-if="index < currentStep" name="check" class="w-4 h-4" /><template v-else>{{ index + 1 }}</template>
        </span><span class="text-sm font-montserratMedium">{{ t(`help.step.${step}`) }}</span>
      </li>
    </ol>

    <div v-if="!isAuthenticated" class="rounded-2xl bg-sand/40 p-5">
      <p class="text-sage mb-4">{{ t('help.login_hint') }}</p><NuxtLink :to="{ path: '/login', query: { redirect: route.fullPath } }"><AppButton is-filled>{{ t('log_in') }}</AppButton></NuxtLink>
    </div>
    <LoadingSpinner v-else-if="loading && !overview" />
    <div v-else-if="error" role="alert" class="border-l-4 border-radar pl-3"><p class="mb-3">{{ error }}</p><AppButton has-outline @click="load">{{ t('try_again') }}</AppButton></div>
    <template v-else-if="overview">
      <div v-if="overview.canRespond" class="flex flex-col md:flex-row md:items-center md:justify-between gap-5 rounded-2xl bg-sand/40 p-5 mb-5">
        <div><h3 class="font-montserratMedium text-lg mb-1">{{ t('help.offer_help_title') }}</h3><p class="text-sm text-sage max-w-xl">{{ t('help.offer_help_hint') }}</p></div>
        <AppButton is-filled :loading="busy" data-test="help-respond" @click="respond">{{ t('help.offer_help_button') }}</AppButton>
      </div>
      <div v-if="canRequest" class="rounded-2xl bg-sand/40 p-5 mb-5">
        <h3 class="font-montserratMedium text-lg mb-2">{{ t('help.request_title') }}</h3><p class="text-sm text-sage mb-4">{{ t('help.request_hint') }}</p>
        <div v-if="requestOptions.length" class="flex flex-col md:flex-row gap-3 md:items-end">
          <div class="flex-1 min-w-0"><label for="help-request" class="text-sm block mb-2">{{ t('help.your_request') }}</label><AppSelect id="help-request" v-model="selectedRequest" :options="selectRequestOptions" :label="t('help.your_request')" full-width :disabled="busy" data-test="help-request-select" /></div>
          <AppButton is-filled :loading="busy" :disabled="!selectedRequest" data-test="help-request-send" @click="requestHelp">{{ t('help.request_button') }}</AppButton>
        </div>
        <div v-else><p class="text-sm text-sage mb-3">{{ t(overview.requests.length ? 'help.requests_already_sent' : 'help.create_request_hint') }}</p><NuxtLink :to="{ path: '/add-announcement', query: { offer: announcement.id } }"><AppButton has-outline>{{ t('create_request') }}</AppButton></NuxtLink></div>
      </div>
      <p v-if="overview.connections.length === 0 && !overview.canRespond && !canRequest" class="text-sage text-sm rounded-2xl bg-sand/30 p-5">{{ t(announcement.isOwner ? 'help.no_responses' : 'help.inactive_hint') }}</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4"><HelpConnectionCard v-for="connection in overview.connections" :key="connection.id" :connection="connection" :show-review-link="false" @updated="emit('updated')" /></div>
      <div v-if="announcement.canReview" id="review" class="scroll-mt-32 mt-6 max-w-2xl">
        <ProfileReviewForm :announcement-id="announcement.id" @saved="emit('updated')" />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
// Imports
import type { AnnouncementDetails } from '~/types/announcement';
import type { HelpOverview } from '~/types/help';

// Props
const props = defineProps<{ announcement: AnnouncementDetails }>();

// Emits
const emit = defineEmits<{ updated: [] }>();

// Composables
const { isAuthenticated, role, user } = useAuth();
const help = useHelp();
const { show } = useFlash();

// Utils
const { t } = useI18n();
const route = useRoute();
const errorText = useApiErrorText();

// Data
const overview = ref<HelpOverview | null>(null);
const loading = ref(false);
const busy = ref(false);
const error = ref('');
const selectedRequest = ref<number | null>(null);
let timer: ReturnType<typeof setInterval> | undefined;

// Constants
const steps = ['connect', 'help', 'review'] as const;

// Computed
const currentStep = computed(() => (props.announcement.status === 'Completed' ? 2 : props.announcement.status === 'InProgress' ? 1 : 0));
const canRequest = computed(
  () =>
    role.value === 'person_in_need' &&
    props.announcement.type === 'HelpOffer' &&
    props.announcement.status === 'Active' &&
    !props.announcement.isOwner,
);
const requestOptions = computed(
  () =>
    overview.value?.requests.filter(
      (request) =>
        !overview.value?.connections.some(
          (connection) => connection.request.id === request.id && (connection.status === 'Pending' || connection.status === 'Accepted'),
        ),
    ) ?? [],
);

const selectRequestOptions = computed(() => requestOptions.value.map((request) => ({ value: request.id, label: request.title })));

// Methods
async function load() {
  if (!isAuthenticated.value || loading.value || busy.value) return;
  loading.value = true;
  error.value = '';
  try {
    const firstLoad = overview.value === null;
    overview.value = await help.overview(props.announcement.id);
    if (!requestOptions.value.some((request) => request.id === selectedRequest.value)) {
      const fromRoute = Number(route.query.request);
      selectedRequest.value = requestOptions.value.find((request) => request.id === fromRoute)?.id ?? requestOptions.value[0]?.id ?? null;
    }
    if (firstLoad && (route.hash === '#help' || route.hash === '#review')) {
      await nextTick();
      document.getElementById(route.hash.slice(1))?.scrollIntoView({ block: 'start' });
    }
  } catch (failure) {
    error.value = errorText(toApiError(failure));
  } finally {
    loading.value = false;
  }
}
async function send(action: () => Promise<unknown>, message: string) {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    await action();
    show(t(message));
    emit('updated');
  } catch (failure) {
    error.value = errorText(toApiError(failure));
  } finally {
    busy.value = false;
  }
}
function respond() {
  return send(() => help.respond(props.announcement.id), 'help.response_sent');
}
function requestHelp() {
  if (selectedRequest.value) return send(() => help.requestHelp(props.announcement.id, selectedRequest.value!), 'help.request_sent');
}

// Watchers
watch(
  () => user.value?.id,
  () => {
    overview.value = null;
    void load();
  },
);

// Lifecycle
onMounted(() => {
  void load();
  timer = setInterval(() => {
    if (!document.hidden) void load();
  }, 15000);
});
onBeforeUnmount(() => clearInterval(timer));
</script>
