// use server error codes for translated validation messages.

export const LIMITS = {
  nameMin: 2,
  nameMax: 50,
  emailMax: 254,
  passwordMin: 8,
  passwordMax: 64,
  titleMin: 5,
  titleMax: 100,
  descriptionMin: 10,
  descriptionMax: 2000,
  expiryMin: 1,
  expiryMax: 30,
  expiryDefault: 14,
  maxPhotos: 5,
  maxPhotoBytes: 10 * 1024 * 1024,
} as const;

export const NAME_REGEX = /^(?=.*\p{L})[\p{L} '’ʼ-]{2,50}$/u;
export const PASSWORD_REGEX = /^(?=.*\p{L})(?=.*\d).{8,64}$/u;
export const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export type Errors<K extends string> = Partial<Record<K, string>>;

export interface LoginForm {
  email: string;
  password: string;
}

export function validateLogin(form: LoginForm): Errors<keyof LoginForm> {
  const errors: Errors<keyof LoginForm> = {};
  if (!form.email.trim()) errors.email = 'FIELDS_REQUIRED';
  if (!form.password) errors.password = 'FIELDS_REQUIRED';
  return errors;
}

export type Role = 'person_in_need' | 'volunteer';

export interface RegistrationForm {
  role: Role | '';
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirm: string;
  city: string;
  region: string;
  phoneNumber: string;
  termsAccepted: boolean;
  ageConfirmed: boolean;
}

export type RegistrationField = keyof RegistrationForm;

export const REGISTRATION_STEP2: RegistrationField[] = ['firstName', 'lastName', 'email', 'password', 'passwordConfirm'];
export const REGISTRATION_STEP3: RegistrationField[] = ['city', 'phoneNumber', 'termsAccepted', 'ageConfirmed'];

export function validateRegistration(form: RegistrationForm): Errors<RegistrationField> {
  const errors: Errors<RegistrationField> = {};
  if (form.role !== 'person_in_need' && form.role !== 'volunteer') errors.role = 'ROLE_REQUIRED';
  if (!NAME_REGEX.test(form.firstName.trim())) errors.firstName = 'FIRST_NAME_INVALID';
  if (!NAME_REGEX.test(form.lastName.trim())) errors.lastName = 'LAST_NAME_INVALID';
  const email = form.email.trim();
  if (!EMAIL_REGEX.test(email) || email.length > LIMITS.emailMax) errors.email = 'EMAIL_INVALID';
  if (!PASSWORD_REGEX.test(form.password)) errors.password = 'PASSWORD_WEAK';
  if (form.passwordConfirm !== form.password) errors.passwordConfirm = 'PASSWORDS_MISMATCH';
  const city = form.city.trim();
  if (city.length < 2 || city.length > 100) errors.city = 'CITY_REQUIRED';
  if (form.phoneNumber.trim() !== '' && !PHONE_REGEX.test(form.phoneNumber.trim())) errors.phoneNumber = 'PHONE_INVALID';
  if (!form.termsAccepted) errors.termsAccepted = 'CONSENT_REQUIRED';
  if (!form.ageConfirmed) errors.ageConfirmed = 'AGE_NOT_CONFIRMED';
  return errors;
}

export interface AnnouncementFormValues {
  title: string;
  description: string;
  categoryId: number | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  expiryDays: number;
  isUrgent: boolean;
}

export type AnnouncementField = 'title' | 'description' | 'categoryId' | 'location' | 'expiryDays' | 'isUrgent';

export function validateAnnouncement(
  form: AnnouncementFormValues,
  isHelpRequest: boolean,
): Errors<AnnouncementField> {
  const errors: Errors<AnnouncementField> = {};
  const title = form.title.trim();
  const description = form.description.trim();
  if (title.length < LIMITS.titleMin || title.length > LIMITS.titleMax) errors.title = 'TITLE_INVALID';
  if (description.length < LIMITS.descriptionMin || description.length > LIMITS.descriptionMax) {
    errors.description = 'DESCRIPTION_INVALID';
  }
  if (!form.categoryId) errors.categoryId = 'CATEGORY_INVALID';
  const hasPoint = form.latitude !== null && form.longitude !== null;
  if (!hasPoint && !form.address.trim()) errors.location = 'LOCATION_REQUIRED';
  if (
    !Number.isInteger(form.expiryDays) ||
    form.expiryDays < LIMITS.expiryMin ||
    form.expiryDays > LIMITS.expiryMax
  ) {
    errors.expiryDays = 'EXPIRY_INVALID';
  }
  if (form.isUrgent && !isHelpRequest) errors.isUrgent = 'URGENT_NOT_ALLOWED';
  return errors;
}

export function validatePhoto(file: { type: string; size: number }): string | null {
  if (!PHOTO_TYPES.includes(file.type) || file.size <= 0 || file.size > LIMITS.maxPhotoBytes) return 'PHOTO_INVALID';
  return null;
}
