<template>
  <div class="flex flex-col justify-start items-start text-left relative-md">
    <h2 class="font-kharkiv md:text-relative-h4 sm:text-relative-h1 xl:text-relative-h4 sm:mb-2 xl:mb-relative-sm">{{ t('choosing_a_role') }}</h2>
    <p class="mb-4 font-montserratRegular">{{ t('choose_role_hint') }}</p>
    <FieldError :text="fieldText(error)" />

    <div class="flex sm:flex-col xl:flex-row justify-start w-full sm:mb-4 xl:mb-relative-sm" role="group" :aria-label="t('choosing_a_role')">
      <button
        type="button"
        class="role-card bg-forest xl:h-96 sm:h-56 mb-[2vh] md:h-[30vh] rounded-2xl ml-0 px-relative-sm sm:w-full xl:w-4/6 cursor-pointer hover:bg-forest-dark hover:ring-4 hover:ring-olive transition duration-300 mx-relative-sm flex flex-col justify-end"
        data-test="role-volunteer"
        @click="emit('selectRole', 'volunteer')"
      >
        <img :src="volunteerImg" alt="" class="illustration xl:w-[50vw] xl:h-[70vh] md:w-[30vw] md:h-[30vh] sm:w-[40vw] sm:h-[40vh] mx-auto object-contain" />
        <span class="text-almost-white font-montserratRegular font-bold sm:text-xs-pxl xl:text-pl sm:mb-2 xl:mb-10 sm:text-center xl:text-left justify-start">{{ t('volunteer') }}</span>
      </button>
      <button
        type="button"
        class="role-card bg-forest xl:h-96 sm:h-56 rounded-2xl md:h-[30vh] ml-0 px-relative-sm sm:w-full xl:w-4/6 cursor-pointer hover:bg-forest-dark hover:ring-4 hover:ring-olive transition duration-300 mx-relative-sm flex flex-col justify-end"
        data-test="role-person-in-need"
        @click="emit('selectRole', 'person_in_need')"
      >
        <img :src="personInNeedImg" alt="" class="illustration xl:w-[50vw] xl:h-[70vh] md:w-[30vw] md:h-[30vh] sm:w-[40vw] sm:h-[40vh] mx-auto object-contain" />
        <span class="text-almost-white font-montserratRegular font-bold sm:text-xs-pxl xl:text-pl sm:mb-2 xl:mb-10 text-center">{{ t('person_in_need') }}</span>
      </button>
    </div>
    <div class="flex xl:justify-start xl:items-start sm:justify-center sm:items-center">
      <p class="md:text-relative-h4 sm:text-relative-h2 xl:text-ps xl:ml-0 font-montserratRegular">
        {{ t('already_have_an_account') }}
        <NuxtLink to="/login" class="text-charcoal font-bold underline hover:text-forest">{{ t('log_in') }}</NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Imports
import volunteerImg from '~/assets/images/Volunteer.svg';
import personInNeedImg from '~/assets/images/Victim.svg';
import type { Role } from '~/utils/validation';

// Props
defineProps<{ error?: string }>();

// Emits
const emit = defineEmits<{ selectRole: [role: Role] }>();

// Utils
const { t } = useI18n();
const fieldText = useFieldErrorText();
</script>

<style scoped>
.illustration {
  filter: hue-rotate(-135deg) saturate(0.75) brightness(0.9);
}
</style>
