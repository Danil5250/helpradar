<template>
  <div class="radar-grid min-h-screen h-screen flex">
    <div class="w-2/6 p-8 xl:flex md:hidden sm:hidden items-left flex flex-col justify-center mt-10">
      <NuxtLink to="/main" :aria-label="t('main')">
        <HelpRadarLogo variant="light" class="!h-10" />
      </NuxtLink>
      <img v-if="stepImage" :src="stepImage" alt="" class="illustration pr-[37%]" />
      <div v-else class="mb-[150%]" />
    </div>

    <div class="xl:w-5/6 md:w-full sm:w-full bg-sand xl:rounded-l-3xl h-full xl:px-relative-md flex flex-col xl:items-start xl:justify-start sm:items-center sm:justify-center overflow-y-auto">
      <div class="flex w-11/12 mt-[2.5vh] xl:hidden">
        <div class="xl:mt-[20%]">
          <BackArrow @click="navigateTo('/main')" />
        </div>
        <div class="flex w-full justify-center">
          <NuxtLink to="/main" :aria-label="t('main')"><HelpRadarLogo class="xl:hidden md:flex sm:flex !h-10" /></NuxtLink>
        </div>
      </div>

      <div class="flex h-full w-11/12">
        <div class="xl:flex sm:hidden">
          <BackArrow v-if="currentStep > 1 && currentStep < 4" @click="currentStep -= 1" />
          <BackArrow v-if="currentStep === 4" @click="navigateTo('/main')" />
        </div>

        <div class="xl:max-w-2xl xl:ml-24 sm:ml-5 mt-7 flex flex-col justify-start flex-grow">
          <template v-if="currentStep < 4">
            <h1 class="font-kharkiv xl:text-relative-h3xl sm:text-relative-h2 mb-relative-ssm mt-relative-ssm">{{ t('acc_creation') }}</h1>
            <div class="mb-relative-sm flex justify-start">
              <Stepper :current-step="currentStep" :steps="3" @step-change="(step: number) => (currentStep = step)" />
            </div>
          </template>

          <div class="flex-grow flex flex-col justify-between">
            <RegistrationChooseRole v-if="currentStep === 1" :error="serverErrors.role" @select-role="selectRole" />
            <RegistrationCompleteMainInfo v-else-if="currentStep === 2" v-model="form" :server-errors="serverErrors" @next="toStep3" />
            <RegistrationAddressStep
              v-else-if="currentStep === 3"
              v-model="form"
              :server-errors="serverErrors"
              :submitting="submitting"
              :submit-error="submitError"
              @submit="submitRegistration"
            />
            <RegistrationEmailConfirm v-else-if="result" :email="form.email.trim()" :queued="result.emailQueued" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import firstShag from '~/assets/images/FirstShag.svg';
import personInNeedSecond from '~/assets/images/VictimSecond.svg';
import volunteerSecond from '~/assets/images/VolunteerSecond.svg';
import emailAccept from '~/assets/images/EmailAccept.svg';
import {
  REGISTRATION_STEP2,
  REGISTRATION_STEP3,
  type RegistrationField,
  type RegistrationForm,
  type Role,
} from '~/utils/validation';

definePageMeta({ layout: 'auth', middleware: 'guest' });
const { t, locale } = useI18n();
const errorText = useApiErrorText();
useHead({ title: computed(() => t('helmet_register')), meta: [{ name: 'description', content: computed(() => t('register_description')) }] });

const currentStep = ref(1);
const form = reactive<RegistrationForm>({
  role: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  passwordConfirm: '',
  city: '',
  region: '',
  phoneNumber: '',
  termsAccepted: false,
  ageConfirmed: false,
});
const serverErrors = ref<Partial<Record<RegistrationField, string>>>({});
const submitting = ref(false);
const submitError = ref('');
const result = ref<{ code: string; emailQueued: boolean } | null>(null);

function selectRole(role: Role) {
  form.role = role;
  currentStep.value = 2;
}

function toStep3() {
  serverErrors.value = {};
  currentStep.value = 3;
}

async function submitRegistration() {
  submitting.value = true;
  submitError.value = '';
  serverErrors.value = {};
  try {
    result.value = await apiFetch<{ code: string; emailQueued: boolean }>('/auth/register', {
      method: 'POST',
      body: {
        role: form.role,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        passwordConfirm: form.passwordConfirm,
        city: form.city.trim(),
        region: form.region || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        termsAccepted: form.termsAccepted,
        ageConfirmed: form.ageConfirmed,
        locale: locale.value,
      },
    });
    currentStep.value = 4;
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.code === 'EMAIL_TAKEN') {
      serverErrors.value = { email: 'EMAIL_TAKEN' };
      currentStep.value = 2;
    } else if (apiError.code === 'VALIDATION_FAILED') {
      const fields = Object.fromEntries(
        Object.entries(apiError.fields).map(([field, info]) => [field, info.code]),
      ) as Partial<Record<RegistrationField, string>>;
      serverErrors.value = fields;
      if (fields.role) currentStep.value = 1;
      else if (REGISTRATION_STEP2.some((field) => fields[field])) currentStep.value = 2;
      else if (REGISTRATION_STEP3.some((field) => fields[field])) currentStep.value = 3;
    } else {
      submitError.value = errorText(apiError, 'errors.REGISTRATION_UNAVAILABLE');
    }
  } finally {
    submitting.value = false;
  }
}

const stepImage = computed(() => {
  if (currentStep.value === 2) return firstShag;
  if (currentStep.value === 3) return form.role === 'volunteer' ? volunteerSecond : personInNeedSecond;
  if (currentStep.value === 4) return emailAccept;
  return null;
});
</script>

<style scoped>
.illustration {
  filter: hue-rotate(-135deg) saturate(0.75) brightness(0.9);
}
</style>
