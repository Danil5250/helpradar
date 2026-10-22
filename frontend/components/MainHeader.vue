<template>
  <header
    class="header w-full fixed bg-almost-white top-0 left-0 z-30 shadow-sm"
    :class="isVisible || isMobileMenuOpen ? 'header-slide-in' : 'header-slide-out'"
  >
    <div class="flex justify-between items-center px-8 py-6 md:ml-10 md:mr-4 xl:ml-20 xl:mr-36">
      <NuxtLink to="/main" :aria-label="t('main')">
        <HelpRadarLogo class="xl:mr-10 md:mr-14" />
      </NuxtLink>
      <nav class="flex-grow hidden xl:flex xl:space-x-20 items-center" :aria-label="t('navigationUPPER')">
        <NavItem v-for="item in navItems" :key="item.to" :text="item.text" :to="item.to" is-last />
      </nav>
      <div class="hidden xl:flex items-center space-x-5">
        <LanguageSelector />
        <template v-if="isAuthenticated && user">
          <span class="font-montserratMedium flex items-center gap-2" data-test="user-name">
            <AppIcon name="user" class="text-forest" />{{ user.firstName }} {{ user.lastName }}
          </span>
          <AppButton has-outline data-test="logout" @click="logout">{{ t('log_outUPPER') }}</AppButton>
        </template>
        <template v-else>
          <NuxtLink to="/login"><AppButton has-outline>{{ t('log_inUPPER') }}</AppButton></NuxtLink>
          <NuxtLink to="/registration"><AppButton is-filled>{{ t('registrationUPPER') }}</AppButton></NuxtLink>
        </template>
      </div>
      <button
        type="button"
        class="xl:hidden ml-auto cursor-pointer z-30 text-charcoal"
        :aria-expanded="isMobileMenuOpen"
        aria-controls="mobile-menu"
        :aria-label="isMobileMenuOpen ? t('close') : t('menu')"
        @click="isMobileMenuOpen = !isMobileMenuOpen"
      >
        <AppIcon :name="isMobileMenuOpen ? 'close' : 'menu'" class="h-7 w-7" />
      </button>
    </div>

    <MobileMenu id="mobile-menu" :is-open="isMobileMenuOpen" :nav-items="navItems" @logout="logout" />
  </header>
</template>

<script setup lang="ts">
const { t } = useI18n();
const { user, isAuthenticated, logout: doLogout } = useAuth();
const { show } = useFlash();
const route = useRoute();

const isMobileMenuOpen = ref(false);
const isVisible = ref(true);
const lastScrollY = ref(0);

function handleScroll() {
  const current = window.scrollY;
  isVisible.value = current < lastScrollY.value || current === 0;
  lastScrollY.value = current;
}

onMounted(() => window.addEventListener('scroll', handleScroll, { passive: true }));
onBeforeUnmount(() => window.removeEventListener('scroll', handleScroll));
watch(() => route.fullPath, () => (isMobileMenuOpen.value = false));

async function logout() {
  isMobileMenuOpen.value = false;
  await doLogout();
  show(t('logged_out'), 'info');
  await navigateTo('/main');
}

const navItems = computed(() => [
  { text: t('advertisementUPPER'), to: '/main' },
  ...(isAuthenticated.value ? [{ text: t('my_announcementsUPPER'), to: '/my-announcements' }] : []),
]);
</script>
