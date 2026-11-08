<template>
  <AppButton has-outline class="inline-flex items-center justify-center gap-2" aria-haspopup="dialog" :aria-expanded="isOpen" data-test="share-open" @click="open">
    <AppIcon name="share" />{{ t('sharing.button') }}
  </AppButton>
  <Teleport to="body">
    <dialog ref="dialog" :aria-labelledby="titleId" :aria-describedby="descriptionId" class="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] rounded-3xl border-2 border-forest bg-almost-white p-0 text-charcoal shadow-xl" data-test="share-dialog" @cancel.prevent="close" @close="close" @click="backdropClick">
      <div class="p-5 md:p-7">
        <div class="flex items-start justify-between gap-4 mb-3">
          <div>
            <p class="text-xs uppercase tracking-widest text-sage mb-2">HelpRadar</p>
            <h2 :id="titleId" class="font-kharkiv text-h5 md:text-h4 leading-tight">{{ t('sharing.title') }}</h2>
          </div>
          <button type="button" class="rounded-full p-2 text-forest hover:bg-sand shrink-0" :aria-label="t('close')" autofocus @click="close"><AppIcon name="close" /></button>
        </div>
        <p :id="descriptionId" class="text-sm text-sage leading-relaxed mb-5">{{ t('sharing.hint') }}</p>
        <template v-if="preview">
          <div class="rounded-2xl bg-sand/50 px-4 py-3 mb-5">
            <p class="text-xs text-sage mb-1">{{ categoryLabel }}</p>
            <p class="font-montserratMedium break-words line-clamp-2">{{ preview.title }}</p>
          </div>
          <div class="grid grid-cols-3 gap-2 md:gap-3" :aria-label="t('sharing.channels')">
            <a v-for="channel in channels" :key="channel.id" :href="channel.href" :target="channel.id === 'email' || channel.id === 'viber' ? undefined : '_blank'" rel="noopener noreferrer" referrerpolicy="no-referrer" class="flex flex-col items-center justify-center gap-2 rounded-2xl border border-sand px-2 py-4 text-sm hover:border-forest hover:bg-sand/30 transition" :data-test="`share-${channel.id}`" @click="selectChannel(channel.id)">
              <img :src="`/icons/social/${channel.id}.svg`" alt="" aria-hidden="true" class="w-7 h-7" />
              <span>{{ channel.label }}</span>
            </a>
          </div>
          <button v-if="canShareNatively" type="button" class="w-full inline-flex items-center justify-center gap-2 rounded-full border-2 border-forest text-forest px-4 py-2 mt-4 text-sm hover:bg-sand/40" :disabled="nativeBusy" @click="shareNative"><AppIcon name="share" />{{ t('sharing.more') }}</button>
          <div class="mt-6 border-t border-sand pt-5">
            <label :for="linkId" class="block text-sm font-montserratMedium mb-2">{{ t('sharing.link') }}</label>
            <input :id="linkId" ref="linkInput" :value="preview.url" type="text" readonly class="w-full min-w-0 rounded-xl border border-sand-dark bg-sand/20 px-3 py-3 text-sm text-sage" data-test="share-link" @focus="selectLink" @click="selectLink" />
            <AppButton is-filled class="w-full mt-3 inline-flex items-center justify-center gap-2" :loading="copyBusy" data-test="share-copy" @click="copyLink"><AppIcon :name="status === 'copied' ? 'check' : 'copy'" />{{ t(status === 'copied' ? 'sharing.copied' : 'sharing.copy') }}</AppButton>
            <p class="mt-3 min-h-5 text-xs text-sage leading-relaxed" role="status" aria-live="polite">{{ status ? t(`sharing.${status}`) : t('sharing.public_link') }}</p>
          </div>
        </template>
      </div>
    </dialog>
  </Teleport>
</template>

<script setup lang="ts">
// Imports
import { announcementSharing, SOCIAL_CHANNELS, socialShareUrl } from '~/utils/sharing';
import type { ShareableAnnouncement, ShareChannel, SocialChannel } from '~/types/sharing';

// Props
const props = defineProps<{ announcement: ShareableAnnouncement }>();

// Composables
const sharing = useSharing();

// Utils
const { t } = useI18n();
const origin = useRequestURL().origin;
const titleId = useId();
const descriptionId = useId();
const linkId = useId();

// Data
const isOpen = ref(false);
const dialog = ref<HTMLDialogElement | null>(null);
const linkInput = ref<HTMLInputElement | null>(null);
const status = ref<'copied' | 'manual_copy' | 'native_failed' | 'viber_hint' | ''>('');
const copyBusy = ref(false);
const nativeBusy = ref(false);
const canShareNatively = ref(false);
let previousOverflow = '';

// Constants
const labels = { telegram: 'Telegram', whatsapp: 'WhatsApp', viber: 'Viber', x: 'X', facebook: 'Facebook' };

// Computed
const preview = computed(() => announcementSharing(props.announcement, origin));
const categoryLabel = computed(() => t(`category.${preview.value.category.id}`, preview.value.category.name));
const shareText = computed(() => `${t(preview.value.type === 'HelpRequest' ? 'help_request' : 'help_offer')}: ${preview.value.title}\n${categoryLabel.value}`);
const channels = computed(() => SOCIAL_CHANNELS.map((id) => ({
  id,
  label: id === 'email' ? t('sharing.email') : labels[id],
  href: socialShareUrl(id, preview.value.url, preview.value.title, shareText.value),
})));

// Methods
function open() {
  isOpen.value = true;
  status.value = '';
}
function close() {
  isOpen.value = false;
}
function backdropClick(event: MouseEvent) {
  if (event.target === dialog.value) close();
}
function record(channel: ShareChannel) {
  void sharing.record(props.announcement.id, channel).catch(() => undefined);
}
function selectChannel(channel: SocialChannel) {
  status.value = channel === 'viber' ? 'viber_hint' : '';
  record(channel);
}
function selectLink() {
  linkInput.value?.select();
}
async function copyLink() {
  if (copyBusy.value) return;
  copyBusy.value = true;
  try {
    await navigator.clipboard.writeText(preview.value.url);
    status.value = 'copied';
    record('copy');
  } catch {
    status.value = 'manual_copy';
    linkInput.value?.focus();
    selectLink();
  } finally {
    copyBusy.value = false;
  }
}
async function shareNative() {
  if (nativeBusy.value) return;
  nativeBusy.value = true;
  try {
    await navigator.share({ title: preview.value.title, text: shareText.value, url: preview.value.url });
    record('native');
  } catch (failure) {
    if ((failure as { name?: string }).name !== 'AbortError') status.value = 'native_failed';
  } finally {
    nativeBusy.value = false;
  }
}

// Watchers
watch(isOpen, async (open) => {
  if (open) {
    await nextTick();
    if (!isOpen.value || !dialog.value) return;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.value?.showModal();
  } else {
    dialog.value?.close();
    document.body.style.overflow = previousOverflow;
  }
});

// Lifecycle
onMounted(() => { canShareNatively.value = typeof navigator.share === 'function'; });
onBeforeUnmount(() => { if (isOpen.value) document.body.style.overflow = previousOverflow; });
</script>

<style scoped>
dialog::backdrop {
  background: rgb(26 36 33 / 60%);
}
</style>
