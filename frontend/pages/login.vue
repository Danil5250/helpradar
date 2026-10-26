<template>
  <div class="radar-grid min-h-screen h-screen flex">
    <div class="w-2/6 p-8 xl:flex md:hidden sm:hidden items-left flex flex-col justify-center mt-10">
      <NuxtLink to="/main" :aria-label="t('main')">
        <HelpRadarLogo variant="light" class="!h-10" />
      </NuxtLink>
      <img :src="loginMain" alt="" class="pr-[37%] illustration" />
    </div>

    <div class="xl:w-5/6 md:w-full sm:w-full bg-sand xl:rounded-l-3xl h-full xl:px-relative-md flex flex-col xl:items-start xl:justify-start sm:items-center sm:justify-center overflow-y-auto">
      <NuxtLink to="/main" class="xl:hidden md:flex sm:flex mt-relative-sm" :aria-label="t('main')">
        <HelpRadarLogo class="!h-10" />
      </NuxtLink>
      <div class="radar-grid rounded-3xl xl:hidden sm:w-2/4 sm:max-h-[30%] sm:mt-6 mt-4 flex justify-center overflow-hidden">
        <img :src="loginMainSmMd" alt="" class="illustration object-contain max-h-full" />
      </div>

      <div class="flex xl:w-full xl:items-start xl:justify-start sm:items-center sm:justify-center sm:w-11/12 h-full">
        <div class="max-w-2xl xl:ml-24 md:ml-0 sm:ml-0 xl:mt-7 sm:mt-4 flex flex-col xl:justify-start sm:justify-center flex-grow">
          <div class="w-full flex xl:items-start sm:items-center xl:justify-start sm:justify-center">
            <h1 class="font-kharkiv xl:ml-0 xl:text-relative-h2 sm:text-relative-h1 xl:mb-relative-ssm mt-relative-ssm">
              {{ t('account_login') }}
            </h1>
          </div>

          <div class="flex-grow flex flex-col justify-between w-full">
            <LoginMain />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Imports
import loginMain from '~/assets/images/LoginMain.svg';
import loginMainSmMd from '~/assets/images/LoginMainSMMD.svg';

// Utils
const { t } = useI18n();
definePageMeta({ layout: 'auth', middleware: 'guest' });
useHead({ title: computed(() => t('helmet_login')), meta: [{ name: 'description', content: computed(() => t('login_description')) }] });
</script>

<style scoped>
.illustration {
  filter: hue-rotate(-135deg) saturate(0.75) brightness(0.9);
}
</style>
