<template>
  <form class="flex flex-col gap-4" novalidate data-test="profile-form" @submit.prevent="submit">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label for="profile-first-name" class="font-montserratRegular mb-2 block">{{ t('name') }}*</label>
        <input id="profile-first-name" v-model="form.firstName" type="text" autocomplete="given-name" :class="[inputClass, { 'border-radar': shown('firstName') }]" :aria-invalid="!!shown('firstName')" data-test="first-name" />
        <FieldError :text="fieldText(shown('firstName'))" />
      </div>
      <div>
        <label for="profile-last-name" class="font-montserratRegular mb-2 block">{{ t('surname') }}*</label>
        <input id="profile-last-name" v-model="form.lastName" type="text" autocomplete="family-name" :class="[inputClass, { 'border-radar': shown('lastName') }]" :aria-invalid="!!shown('lastName')" data-test="last-name" />
        <FieldError :text="fieldText(shown('lastName'))" />
      </div>
    </div>

    <div class="relative">
      <label for="profile-city" class="font-montserratRegular mb-2 block">{{ t('city_of_living') }}*</label>
      <AppSelect
        id="profile-city"
        v-model="form.city"
        :options="cityOptions"
        searchable
        full-width
        :placeholder="t('city_placeholder')"
        :invalid="!!shown('city')"
        data-test="city"
        @search="onCityInput"
        @change="selectCity"
      />
      <FieldError :text="fieldText(shown('city'))" />
    </div>

    <div v-if="role === 'person_in_need'" class="relative">
      <label for="profile-street" class="font-montserratRegular mb-2 block">{{ t('street') }} <span class="text-sage text-sm">({{ t('optional') }})</span></label>
      <AppSelect
        id="profile-street"
        v-model="form.street"
        :options="selectStreetOptions"
        searchable
        full-width
        :invalid="!!shown('street')"
        data-test="street"
        @search="onStreetInput"
        @change="selectStreet"
      />
      <FieldError :text="fieldText(shown('street'))" />
    </div>

    <div>
      <label for="profile-phone" class="font-montserratRegular mb-2 block">{{ t('telephone_number') }} <span class="text-sage text-sm">({{ t('optional') }})</span></label>
      <input id="profile-phone" v-model="form.phoneNumber" type="tel" autocomplete="tel" inputmode="tel" placeholder="+380XXXXXXXXX" :class="[inputClass, { 'border-radar': shown('phoneNumber') }]" :aria-invalid="!!shown('phoneNumber')" data-test="phone" />
      <FieldError :text="fieldText(shown('phoneNumber'))" />
    </div>

    <div>
      <label for="profile-email" class="font-montserratRegular mb-2 block">{{ t('email') }}*</label>
      <input id="profile-email" v-model="form.email" type="email" autocomplete="email" :class="[inputClass, { 'border-radar': shown('email') }]" :aria-invalid="!!shown('email')" data-test="email" />
      <p class="text-xs text-sage mt-1">{{ t('email_change_hint') }}</p>
      <FieldError :text="fieldText(shown('email'))" />
    </div>

    <div>
      <label for="profile-about" class="font-montserratRegular mb-2 block">{{ t('about_me') }} <span class="text-sage text-sm">({{ t('optional') }})</span></label>
      <textarea id="profile-about" v-model="form.aboutMe" rows="4" :maxlength="LIMITS.aboutMax" :class="[inputClass, { 'border-radar': shown('aboutMe') }]" data-test="about" />
      <p class="text-xs text-sage text-right">{{ form.aboutMe.length }}/{{ LIMITS.aboutMax }}</p>
      <FieldError :text="fieldText(shown('aboutMe'))" />
    </div>

    <fieldset v-if="role === 'volunteer'">
      <legend class="font-montserratRegular mb-2">{{ t('help_types') }}</legend>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="type in SUPPORT_TYPES"
          :key="type"
          type="button"
          class="px-4 py-2 rounded-full border-2 font-montserratMedium"
          :class="supports.includes(type) ? 'bg-forest text-almost-white border-forest' : 'border-sage text-charcoal'"
          :aria-pressed="supports.includes(type)"
          :data-test="`support-${type}`"
          @click="toggleSupport(type)"
        >
          {{ t(`support.${type}`) }}
        </button>
      </div>
      <FieldError :text="fieldText(shown('supports'))" />
    </fieldset>

    <p v-if="submitError" class="border-l-4 border-radar bg-sand rounded-r-lg px-3 py-2" role="alert" data-test="profile-error">{{ submitError }}</p>

    <div class="flex gap-3">
      <AppButton type="submit" is-filled :loading="busy" data-test="profile-save">{{ t('saveUPPER') }}</AppButton>
      <AppButton has-outline :disabled="busy" @click="emit('cancel')">{{ t('cancel') }}</AppButton>
    </div>
  </form>
</template>

<script setup lang="ts">
// Imports
import { SUPPORT_TYPES, type Profile, type ProfileUpdated, type SupportType } from '~/types/profile';
import { LIMITS, validateProfile, type Errors, type ProfileField, type ProfileForm } from '~/utils/validation';

// Props
const props = defineProps<{ profile: Profile }>();

// Emits
const emit = defineEmits<{ saved: [result: ProfileUpdated]; cancel: [] }>();

// Composables
const profileApi = useProfile();
const announcements = useAnnouncements();

// Utils
const { t, locale } = useI18n();
const fieldText = useFieldErrorText();
const errorText = useApiErrorText();

// Data
const form = ref<ProfileForm>({
  firstName: props.profile.firstName,
  lastName: props.profile.lastName,
  city: props.profile.city ?? '',
  region: props.profile.region ?? '',
  street: props.profile.street ?? '',
  phoneNumber: props.profile.phoneNumber ?? '',
  aboutMe: props.profile.aboutMe,
  email: props.profile.email,
});
const supports = ref<SupportType[]>([...props.profile.supports]);
const errors = ref<Errors<ProfileField>>({});
const serverErrors = ref<Errors<ProfileField>>({});
const submitError = ref('');
const busy = ref(false);
const streetOptions = ref<string[]>([]);
let streetTimer: ReturnType<typeof setTimeout> | undefined;

// Constants
const inputClass = 'w-full p-3 border-2 rounded-lg outline-none bg-almost-white border-sage focus:border-forest';
const shown = (field: ProfileField) => errors.value[field] ?? serverErrors.value[field];

// Computed
const role = computed(() => props.profile.role);
const cityOptions = computed(() => searchCities(form.value.city).map((option) => ({ value: option.city, label: `${option.city} (${option.region})` })));
const selectStreetOptions = computed(() => streetOptions.value.map((street) => ({ value: street, label: street })));

// Methods
function onCityInput() {
  form.value.region = '';
}

function selectCity(city: string) {
  form.value.city = city;
  form.value.region = findCity(city)?.region ?? '';
}

function onStreetInput() {
  clearTimeout(streetTimer);
  const query = form.value.street.trim();
  if (query.length < 3) {
    streetOptions.value = [];
    return;
  }
  streetTimer = setTimeout(async () => {
    try {
      const places = await announcements.searchAddress(`${query}, ${form.value.city}`);
      streetOptions.value = [...new Set(places.map((place) => place.label.split(',')[0].trim()).filter(Boolean))];
    } catch {
      streetOptions.value = [];
    }
  }, 400);
}

function selectStreet(option: string) {
  form.value.street = option;
  streetOptions.value = [];
}

function toggleSupport(type: SupportType) {
  supports.value = supports.value.includes(type) ? supports.value.filter((item) => item !== type) : [...supports.value, type];
}

async function submit() {
  serverErrors.value = {};
  submitError.value = '';
  errors.value = validateProfile(form.value);
  const known = findCity(form.value.city);
  if (!errors.value.city && !known) errors.value.city = 'CITY_REQUIRED';
  if (known) form.value.region = known.region;
  if (Object.keys(errors.value).length > 0) return;

  busy.value = true;
  try {
    const email = form.value.email.trim();
    const result = await profileApi.update({
      firstName: form.value.firstName.trim(),
      lastName: form.value.lastName.trim(),
      city: form.value.city.trim(),
      region: form.value.region,
      phoneNumber: form.value.phoneNumber.trim(),
      aboutMe: form.value.aboutMe,
      ...(role.value === 'person_in_need' ? { street: form.value.street.trim() } : {}),
      ...(role.value === 'volunteer' ? { supports: supports.value } : {}),
      ...(email.toLowerCase() !== props.profile.email.toLowerCase() ? { email, locale: locale.value } : {}),
    });
    emit('saved', result);
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError.code === 'VALIDATION_FAILED') {
      for (const [field, value] of Object.entries(apiError.fields)) serverErrors.value[field as ProfileField] = value.code;
    } else if (apiError.code === 'NEW_EMAIL_TAKEN') {
      serverErrors.value.email = 'NEW_EMAIL_TAKEN';
    } else {
      submitError.value = errorText(apiError, 'errors.PROFILE_SAVE_FAILED');
    }
  } finally {
    busy.value = false;
  }
}

// Lifecycle
onBeforeUnmount(() => clearTimeout(streetTimer));
</script>
