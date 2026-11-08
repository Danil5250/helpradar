<template>
  <article class="rounded-3xl border-2 border-sand bg-almost-white p-5 md:p-6 flex flex-col" :data-test="`help-connection-${connection.id}`">
    <div class="flex items-center justify-between gap-3 mb-4">
      <span class="rounded-full px-3 py-1 text-xs font-montserratMedium" :class="badgeClass">{{ t(`help.state.${state}`) }}</span>
      <span class="text-xs text-sage">{{ formatDate(connection.dateCreated, locale) }}</span>
    </div>
    <NuxtLink :to="`/main/announcement/${connection.request.id}#help`" class="font-kharkiv text-xl leading-snug break-words hover:text-forest">{{ connection.request.title }}</NuxtLink>
    <NuxtLink :to="`/users/${partner.id}`" class="flex items-center gap-3 my-5 self-start hover:text-forest">
      <img :src="partner.avatarUrl" alt="" class="w-11 h-11 rounded-full object-cover bg-sand" />
      <div><p class="text-xs text-sage">{{ t(isRequester ? 'role_volunteer' : 'help.recipient') }}</p><p class="font-montserratMedium">{{ partner.name }}</p></div>
    </NuxtLink>
    <p class="text-sm text-sage leading-relaxed mb-4">{{ t(hint) }}</p>
    <a v-if="connection.contactPhone" :href="`tel:${connection.contactPhone}`" class="mb-4 font-montserratMedium text-forest underline self-start">{{ connection.contactPhone }}</a>
    <div class="flex flex-wrap items-center gap-3 mt-auto">
      <AppButton v-for="action in connection.actions" :key="action" :is-filled="action === 'accept' || action === 'complete'" :has-outline="action === 'decline'" :loading="busy === action" :disabled="busy !== null" :data-test="`help-${action}-${connection.id}`" @click="choose(action)">
        <AppIcon v-if="action === 'accept' || action === 'complete'" name="check" class="inline mr-1" />{{ t(`help.action.${action}`) }}
      </AppButton>
      <NuxtLink v-if="connection.canReview && showReviewLink" :to="`/main/announcement/${connection.request.id}#review`"><AppButton is-filled>{{ t('leave_review') }}</AppButton></NuxtLink>
      <NuxtLink v-if="connection.hasReview" :to="`/users/${connection.volunteer.id}`" class="text-sm font-montserratMedium underline text-forest">{{ t('help.view_review') }}</NuxtLink>
    </div>
    <p v-if="error" role="alert" class="mt-4 border-l-4 border-radar pl-3 text-sm">{{ error }}</p>
    <ModalAsk :is-open="confirming !== null" :title="t(`help.confirm_${confirming ?? 'complete'}_title`)" :message="t(`help.confirm_${confirming ?? 'complete'}_text`)" @confirm="confirm" @close="confirming = null" />
  </article>
</template>

<script setup lang="ts">
// Imports
import type { HelpAction, HelpConnection } from '~/types/help';

// Props
const props = withDefaults(defineProps<{ connection: HelpConnection; showReviewLink?: boolean }>(), { showReviewLink: true });

// Emits
const emit = defineEmits<{ updated: [] }>();

// Composables
const { user } = useAuth();
const help = useHelp();
const { show } = useFlash();

// Utils
const { t, locale } = useI18n();
const errorText = useApiErrorText();

// Data
const busy = ref<HelpAction | null>(null);
const confirming = ref<'complete' | 'cancel' | null>(null);
const error = ref('');

// Computed
const isRequester = computed(() => user.value?.id === props.connection.requester.id);
const partner = computed(() => (isRequester.value ? props.connection.volunteer : props.connection.requester));
const state = computed(() =>
  ['InProgress', 'Completed', 'Closed', 'Deleted', 'Hidden'].includes(props.connection.request.status) &&
  props.connection.status !== 'Declined' &&
  props.connection.status !== 'Withdrawn'
    ? props.connection.request.status
    : props.connection.status,
);
const badgeClass = computed(() =>
  state.value === 'InProgress'
    ? 'bg-radar/15 text-charcoal'
    : state.value === 'Completed'
      ? 'bg-forest text-almost-white'
      : 'bg-sand text-sage',
);
const hint = computed(() => {
  if (state.value === 'InProgress') return isRequester.value ? 'help.in_progress_recipient' : 'help.in_progress_volunteer';
  if (state.value === 'Completed')
    return props.connection.hasReview
      ? 'help.review_published'
      : isRequester.value && props.connection.canReview
        ? 'help.review_invitation'
        : 'help.completed_hint';
  if (state.value === 'Pending') return props.connection.actions.includes('accept') ? 'help.waiting_for_you' : 'help.waiting_for_partner';
  return 'help.inactive_hint';
});

// Methods
function choose(action: HelpAction) {
  if (action === 'complete' || action === 'cancel') confirming.value = action;
  else void run(action);
}
async function confirm() {
  const action = confirming.value;
  confirming.value = null;
  if (action) await run(action);
}
async function run(action: HelpAction) {
  if (busy.value) return;
  busy.value = action;
  error.value = '';
  try {
    await help.act(props.connection.id, action);
    show(t(`help.success.${action}`));
    emit('updated');
  } catch (failure) {
    error.value = errorText(toApiError(failure));
  } finally {
    busy.value = null;
  }
}
</script>
