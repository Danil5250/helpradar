<template>
  <form class="flex flex-col items-start sm:pr-6 xl:pr-8 pb-8 w-full" novalidate @submit.prevent="handleSubmit">
    <h2 class="xl:text-relative-h4 sm:text-xs-pxl font-kharkiv sm:mb-2 xl:mb-4">{{ t('fill_in_the_data') }}</h2>

    <div class="grid xl:grid-cols-2 gap-x-4 w-full mb-0">
      <div class="flex flex-col mb-4">
        <label for="reg-first-name" class="font-montserratRegular mb-2">{{ t('name') }}*</label>
        <input id="reg-first-name" v-model="form.firstName" type="text" name="firstName" autocomplete="given-name" :placeholder="t('your_name')" :class="[inputClass, { 'border-radar': shown('firstName', serverErrors) }]" :aria-invalid="!!shown('firstName', serverErrors)" aria-describedby="reg-first-name-error" />
        <FieldError id="reg-first-name-error" :text="fieldText(shown('firstName', serverErrors))" />
      </div>
      <div class="flex flex-col mb-4">
        <label for="reg-last-name" class="font-montserratRegular mb-2">{{ t('surname') }}*</label>
        <input id="reg-last-name" v-model="form.lastName" type="text" name="lastName" autocomplete="family-name" :placeholder="t('your_surname')" :class="[inputClass, { 'border-radar': shown('lastName', serverErrors) }]" :aria-invalid="!!shown('lastName', serverErrors)" aria-describedby="reg-last-name-error" />
        <FieldError id="reg-last-name-error" :text="fieldText(shown('lastName', serverErrors))" />
      </div>
    </div>

    <div class="w-full mb-4">
      <label for="reg-email" class="font-montserratRegular mb-2 block">{{ t('email') }}*</label>
      <input id="reg-email" v-model="form.email" type="email" name="email" autocomplete="email" :placeholder="t('email_address')" :class="[inputClass, { 'border-radar': shown('email', serverErrors) }]" :aria-invalid="!!shown('email', serverErrors)" aria-describedby="reg-email-error" />
      <FieldError id="reg-email-error" :text="fieldText(shown('email', serverErrors))" />
    </div>

    <div class="w-full mb-4 relative">
      <label for="reg-password" class="font-montserratRegular mb-2 block">{{ t('password') }}*</label>
      <input id="reg-password" v-model="form.password" :type="showPassword ? 'text' : 'password'" name="password" autocomplete="new-password" :placeholder="t('your_password')" :class="[inputClass, 'pr-12', { 'border-radar': shown('password', serverErrors) }]" :aria-invalid="!!shown('password', serverErrors)" aria-describedby="reg-password-hint reg-password-error" />
      <button type="button" class="absolute right-3 top-[2.9rem] text-charcoal hover:text-forest" :aria-label="showPassword ? t('hide_password') : t('show_password')" :aria-pressed="showPassword" @click="showPassword = !showPassword">
        <AppIcon :name="showPassword ? 'eye-off' : 'eye'" />
      </button>
      <p id="reg-password-hint" class="text-sm mt-1 text-sage">{{ t('password_hint') }}</p>
      <FieldError id="reg-password-error" :text="fieldText(shown('password', serverErrors))" />
    </div>

    <div class="w-full mb-6 relative">
      <label for="reg-password-confirm" class="font-montserratRegular mb-2 block">{{ t('repeat_password') }}*</label>
      <input id="reg-password-confirm" v-model="form.passwordConfirm" :type="showConfirm ? 'text' : 'password'" name="passwordConfirm" autocomplete="new-password" :placeholder="t('repeat_password')" :class="[inputClass, 'pr-12', { 'border-radar': shown('passwordConfirm', serverErrors) }]" :aria-invalid="!!shown('passwordConfirm', serverErrors)" aria-describedby="reg-password-confirm-error" />
      <button type="button" class="absolute right-3 top-[2.9rem] text-charcoal hover:text-forest" :aria-label="showConfirm ? t('hide_password') : t('show_password')" :aria-pressed="showConfirm" @click="showConfirm = !showConfirm">
        <AppIcon :name="showConfirm ? 'eye-off' : 'eye'" />
      </button>
      <FieldError id="reg-password-confirm-error" :text="fieldText(shown('passwordConfirm', serverErrors))" />
    </div>

    <AppButton type="submit" is-filled class="w-full text-charcoal py-3 rounded-full mb-5" data-test="step2-next">{{ t('continueUPPER') }}</AppButton>

    <div class="flex w-full justify-center">
      <p class="sm:text-xs-ps xl:text-ps font-montserratRegular">
        {{ t('already_have_an_account') }}
        <NuxtLink to="/login" class="text-charcoal font-bold underline hover:text-forest">{{ t('log_in') }}</NuxtLink>
      </p>
    </div>
  </form>
</template>

<script setup lang="ts">
import { REGISTRATION_STEP2, validateRegistration, type RegistrationField, type RegistrationForm } from '~/utils/validation';

const form = defineModel<RegistrationForm>({ required: true });
defineProps<{ serverErrors: Partial<Record<RegistrationField, string>> }>();
const emit = defineEmits<{ next: [] }>();

const { t } = useI18n();
const fieldText = useFieldErrorText();
const showPassword = ref(false);
const showConfirm = ref(false);
const errors = ref<Partial<Record<RegistrationField, string>>>({});

function handleSubmit() {
  const all = validateRegistration(form.value);
  errors.value = {};
  for (const field of REGISTRATION_STEP2) if (all[field]) errors.value[field] = all[field];
  if (Object.keys(errors.value).length === 0) emit('next');
}

const inputClass = 'w-full p-3 border-2 rounded-lg outline-none bg-almost-white border-sage focus:border-forest';
const shown = (field: RegistrationField, server?: Partial<Record<RegistrationField, string>>) => errors.value[field] ?? server?.[field];
</script>
