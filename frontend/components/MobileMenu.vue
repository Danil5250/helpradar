<template>
  <div
    class="xl:hidden fixed top-[5.25rem] left-0 right-0 bg-almost-white z-20 overflow-hidden transform transition-all duration-500 ease-in-out"
    :class="isOpen ? 'h-[calc(100vh-5.25rem)]' : 'h-0'"
    :inert="!isOpen"
  >
    <nav class="h-full flex flex-col my-10 sm:mx-5 md:mx-20 space-y-5 text-lg box-border w-[90%]">
      <NavItem v-for="(item, index) in navItems" :key="item.to" :text="item.text" :to="item.to" :is-last="index === navItems.length - 1" />

      <div class="flex flex-col space-y-5 md:mr-14 sm:mr-0 mt-auto pb-24">
        <LanguageSelector />
        <template v-if="isAuthenticated && user">
          <p class="font-montserratMedium flex items-center gap-2"><AppIcon name="user" class="text-forest" />{{ user.firstName }} {{ user.lastName }}</p>
          <AppButton has-outline class="w-full md:text-pxl" @click="emit('logout')">{{ t('log_outUPPER') }}</AppButton>
        </template>
        <template v-else>
          <NuxtLink to="/login" class="w-full mt-8"><AppButton has-outline class="w-full md:text-pxl">{{ t('log_inUPPER') }}</AppButton></NuxtLink>
          <NuxtLink to="/registration" class="w-full"><AppButton is-filled class="w-full md:text-pxl">{{ t('registrationUPPER') }}</AppButton></NuxtLink>
        </template>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
// Props
defineProps<{ isOpen: boolean; navItems: { text: string; to: string }[] }>();

// Emits
const emit = defineEmits<{ logout: [] }>();

// Composables
const { user, isAuthenticated } = useAuth();

// Utils
const { t } = useI18n();
</script>
