<template>
  <form class="flex flex-col items-start pr-8 pb-8 w-full" novalidate @submit.prevent="handleSubmit">
    <h2 class="sm:text-xs-pxl xl:text-relative-h4 font-kharkiv mb-4">{{ t('fill_in_the_data') }}</h2>
    <div class="w-full mb-4 relative">
      <label for="reg-city" class="font-montserratRegular mb-2 block">{{ t('city_of_living') }}*</label>
      <input
        id="reg-city"
        v-model="form.city"
        type="text"
        role="combobox"
        autocomplete="off"
        :placeholder="t('city_placeholder')"
        :aria-expanded="cityOpen && options.length > 0"
        aria-controls="reg-city-list"
        aria-autocomplete="list"
        :aria-activedescendant="activeIndex >= 0 ? `reg-city-option-${activeIndex}` : undefined"
        :aria-invalid="!!shown('city')"
        aria-describedby="reg-city-error"
        :class="[inputClass, { 'border-radar': shown('city') }]"
        data-test="city"
        @input="onCityInput"
        @keydown="onCityKeydown"
        @blur="cityOpen = false"
      />
      <ul
        v-if="options.length > 0"
        id="reg-city-list"
        role="listbox"
        class="absolute w-full border-2 border-sage bg-almost-white rounded-lg z-10 max-h-48 overflow-y-auto shadow-lg"
      >
        <li
          v-for="(option, index) in options"
          :id="`reg-city-option-${index}`"
          :key="`${option.region}-${option.city}`"
          role="option"
          :aria-selected="index === activeIndex"
          class="p-2 cursor-pointer hover:bg-sand"
          :class="{ 'bg-sand': index === activeIndex }"
          @mousedown.prevent="selectCity(option)"
        >
          {{ option.city }} <span class="text-sage text-sm">({{ option.region }})</span>
        </li>
      </ul>
      <FieldError id="reg-city-error" :text="fieldText(shown('city'))" />
    </div>
    <div class="w-full mb-4">
      <label for="reg-phone" class="font-montserratRegular mb-2 block">{{ t('telephone_number') }} <span class="text-sage text-sm">({{ t('optional') }})</span></label>
      <input id="reg-phone" v-model="form.phoneNumber" type="tel" name="phoneNumber" autocomplete="tel" inputmode="tel" placeholder="+380XXXXXXXXX" :class="[inputClass, { 'border-radar': shown('phoneNumber') }]" :aria-invalid="!!shown('phoneNumber')" aria-describedby="reg-phone-error" />
      <FieldError id="reg-phone-error" :text="fieldText(shown('phoneNumber'))" />
    </div>
    <div class="w-full mb-2">
      <label class="flex items-start gap-3 font-montserratRegular cursor-pointer">
        <input v-model="form.termsAccepted" type="checkbox" class="mt-1 h-5 w-5 accent-forest" :aria-invalid="!!shown('termsAccepted')" aria-describedby="reg-terms-error" data-test="terms" />
        <span>{{ t('accept_terms') }}</span>
      </label>
      <FieldError id="reg-terms-error" :text="fieldText(shown('termsAccepted'))" />
    </div>
    <div class="w-full mb-6">
      <label class="flex items-start gap-3 font-montserratRegular cursor-pointer">
        <input v-model="form.ageConfirmed" type="checkbox" class="mt-1 h-5 w-5 accent-forest" :aria-invalid="!!shown('ageConfirmed')" aria-describedby="reg-age-error" data-test="age" />
        <span>{{ t('confirm_age') }}</span>
      </label>
      <FieldError id="reg-age-error" :text="fieldText(shown('ageConfirmed'))" />
    </div>

    <div role="alert" class="w-full">
      <p v-if="submitError" class="text-charcoal mb-4 border-l-4 border-radar bg-almost-white rounded-r-lg px-3 py-2" data-test="register-error">{{ submitError }}</p>
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
const cityOpen = ref(false);
const activeIndex = ref(-1);

// Constants
const inputClass = 'w-full p-3 border-2 rounded-lg outline-none bg-almost-white border-sage focus:border-forest';
const shown = (field: RegistrationField) => errors.value[field] ?? props.serverErrors[field];

// Computed
const options = computed(() => (cityOpen.value ? searchCities(form.value.city) : []));

// Methods
function onCityInput() {
  form.value.region = '';
  cityOpen.value = true;
  activeIndex.value = -1;
}

function selectCity(option: CityOption) {
  form.value.city = option.city;
  form.value.region = option.region;
  cityOpen.value = false;
  activeIndex.value = -1;
}

function onCityKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    cityOpen.value = true;
    activeIndex.value = Math.min(activeIndex.value + 1, options.value.length - 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeIndex.value = Math.max(activeIndex.value - 1, 0);
  } else if (event.key === 'Enter' && cityOpen.value && activeIndex.value >= 0) {
    event.preventDefault();
    selectCity(options.value[activeIndex.value]);
  } else if (event.key === 'Escape') {
    cityOpen.value = false;
  }
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
