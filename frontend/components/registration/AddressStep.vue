<template>
  <form class="flex flex-col items-start pr-8 pb-8 w-full" novalidate @submit.prevent="handleSubmit">
    <h2 class="sm:text-xs-pxl xl:text-relative-h4 font-kharkiv mb-4">{{ t('fill_in_the_data') }}</h2>
    <div class="w-full mb-4 relative">
      <label for="reg-city" class="font-montserratRegular mb-2 block">{{ t('city_of_living') }}*</label>
      <AppSelect
        id="reg-city"
        v-model="form.city"
        :options="options"
        searchable
        full-width
        :disabled="submitting"
        :placeholder="t('city_placeholder')"
        :invalid="!!shown('city')"
        described-by="reg-city-error"
        data-test="city"
        @search="onCityInput"
        @change="selectCity"
      />
      <FieldError id="reg-city-error" :text="fieldText(shown('city'))" />
    </div>
    <div class="w-full mb-4">
      <label for="reg-phone" class="font-montserratRegular mb-2 block"
        >{{ t('telephone_number') }} <span class="text-sage text-sm">({{ t('optional') }})</span></label
      >
      <input
        id="reg-phone"
        v-model="form.phoneNumber"
        type="tel"
        name="phoneNumber"
        autocomplete="tel"
        inputmode="tel"
        placeholder="+380XXXXXXXXX"
        :class="[inputClass, { 'border-radar': shown('phoneNumber') }]"
        :aria-invalid="!!shown('phoneNumber')"
        aria-describedby="reg-phone-error"
      />
      <FieldError id="reg-phone-error" :text="fieldText(shown('phoneNumber'))" />
    </div>
    <div class="w-full mb-2">
      <label class="flex items-start gap-3 font-montserratRegular cursor-pointer">
        <input
          v-model="form.termsAccepted"
          type="checkbox"
          class="mt-1 h-5 w-5 accent-forest"
          :aria-invalid="!!shown('termsAccepted')"
          aria-describedby="reg-terms-error"
          data-test="terms"
        />
        <span>{{ t('accept_terms') }}</span>
      </label>
      <FieldError id="reg-terms-error" :text="fieldText(shown('termsAccepted'))" />
    </div>
    <div class="w-full mb-6">
      <label class="flex items-start gap-3 font-montserratRegular cursor-pointer">
        <input
          v-model="form.ageConfirmed"
          type="checkbox"
          class="mt-1 h-5 w-5 accent-forest"
          :aria-invalid="!!shown('ageConfirmed')"
          aria-describedby="reg-age-error"
          data-test="age"
        />
        <span>{{ t('confirm_age') }}</span>
      </label>
      <FieldError id="reg-age-error" :text="fieldText(shown('ageConfirmed'))" />
    </div>

    <div role="alert" class="w-full">
      <p v-if="submitError" class="text-charcoal mb-4 border-l-4 border-radar bg-almost-white rounded-r-lg px-3 py-2" data-test="register-error">
        {{ submitError }}
      </p>
    </div>

    <AppButton type="submit" is-filled :loading="submitting" class="w-full text-charcoal py-3 rounded-full mb-5" data-test="register-submit">
      {{ t('create_accountUPPER') }}
    </AppButton>
  </form>
</template>

<script setup lang="ts">
// Imports
import { REGISTRATION_STEP3, validateRegistration, type RegistrationField, type RegistrationForm } from '~/utils/validation';

// Props
const form = defineModel<RegistrationForm>({ required: true });
const props = defineProps<{
  serverErrors: Partial<Record<RegistrationField, string>>;
  submitting: boolean;
  submitError: string;
}>();

// Emits
const emit = defineEmits<{ submit: [] }>();

// Utils
const { t } = useI18n();
const fieldText = useFieldErrorText();

// Data
const errors = ref<Partial<Record<RegistrationField, string>>>({});

// Constants
const inputClass = 'w-full p-3 border-2 rounded-lg outline-none bg-almost-white border-sage focus:border-forest';
const shown = (field: RegistrationField) => errors.value[field] ?? props.serverErrors[field];

// Computed
const options = computed(() => searchCities(form.value.city).map((option) => ({ value: option.city, label: `${option.city} (${option.region})` })));

// Methods
function onCityInput() {
  form.value.region = '';
}

function selectCity(city: string) {
  form.value.city = city;
  form.value.region = findCity(city)?.region ?? '';
}

function handleSubmit() {
  const all = validateRegistration(form.value);
  errors.value = {};
  for (const field of REGISTRATION_STEP3) if (all[field]) errors.value[field] = all[field];
  const known = findCity(form.value.city);
  if (!errors.value.city && !known) errors.value.city = 'CITY_REQUIRED';
  if (known) form.value.region = known.region;
  if (Object.keys(errors.value).length === 0) emit('submit');
}
</script>
