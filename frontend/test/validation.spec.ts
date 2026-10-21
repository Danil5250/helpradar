import { describe, expect, it } from 'vitest';
import {
  LIMITS,
  NAME_REGEX,
  PASSWORD_REGEX,
  PHONE_REGEX,
  validateAnnouncement,
  validateLogin,
  validatePhoto,
  validateRegistration,
  type AnnouncementFormValues,
  type RegistrationForm,
} from '~/utils/validation';

const validRegistration = (): RegistrationForm => ({
  role: 'volunteer',
  firstName: 'Olena',
  lastName: "O'Connor-Shevchenko",
  email: 'olena@example.com',
  password: 'Secret123',
  passwordConfirm: 'Secret123',
  city: 'Львів',
  region: 'Львівська область',
  phoneNumber: '',
  termsAccepted: true,
  ageConfirmed: true,
});

const validAnnouncement = (): AnnouncementFormValues => ({
  title: 'Need medicines',
  description: 'My mother needs insulin and cannot leave the house.',
  categoryId: 2,
  address: '',
  latitude: 49.84,
  longitude: 24.03,
  expiryDays: 14,
  isUrgent: false,
});

describe('registration rules (SRS 3.2.1.2)', () => {
  it.each(['Al', 'Olena', 'Anna-Maria', "O'Brien", 'Марія', 'Дзвінʼяк', 'x'.repeat(50)])('accepts the name %s', (name) => {
    expect(NAME_REGEX.test(name)).toBe(true);
  });
  it.each(['A', '', 'x'.repeat(51), 'John3', '--', ' ', 'a@b'])('rejects the name %j', (name) => {
    expect(NAME_REGEX.test(name)).toBe(false);
  });
  it.each(['abcdefg1', 'Секрет123', `a1${'x'.repeat(62)}`])('accepts the password %s', (password) => {
    expect(PASSWORD_REGEX.test(password)).toBe(true);
  });
  it.each(['abcdefgh', '12345678', 'a1', `a1${'x'.repeat(63)}`])('rejects the password %s', (password) => {
    expect(PASSWORD_REGEX.test(password)).toBe(false);
  });
  it.each(['+380501234567', '+14155552671'])('accepts the phone %s', (phone) => expect(PHONE_REGEX.test(phone)).toBe(true));
  it.each(['0501234567', '+38 050 123 45 67', '+12'])('rejects the phone %s', (phone) => expect(PHONE_REGEX.test(phone)).toBe(false));

  it('accepts a complete form (phone is optional)', () => {
    expect(validateRegistration(validRegistration())).toEqual({});
    expect(validateRegistration({ ...validRegistration(), phoneNumber: '+380501234567' })).toEqual({});
  });

  it('returns the SRS error codes for every wrong field', () => {
    const errors = validateRegistration({
      role: '',
      firstName: 'A',
      lastName: '12',
      email: 'nope',
      password: 'short',
      passwordConfirm: 'other',
      city: '',
      region: '',
      phoneNumber: '0501234567',
      termsAccepted: false,
      ageConfirmed: false,
    });
    expect(errors).toEqual({
      role: 'ROLE_REQUIRED',
      firstName: 'FIRST_NAME_INVALID',
      lastName: 'LAST_NAME_INVALID',
      email: 'EMAIL_INVALID',
      password: 'PASSWORD_WEAK',
      passwordConfirm: 'PASSWORDS_MISMATCH',
      city: 'CITY_REQUIRED',
      phoneNumber: 'PHONE_INVALID',
      termsAccepted: 'CONSENT_REQUIRED',
      ageConfirmed: 'AGE_NOT_CONFIRMED',
    });
  });

  it('limits the e-mail to 254 characters', () => {
    expect(validateRegistration({ ...validRegistration(), email: `${'a'.repeat(250)}@example.com` }).email).toBe('EMAIL_INVALID');
  });
});

describe('login rules (SRS 3.2.2.3 step 2)', () => {
  it('requires both fields', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({ email: 'FIELDS_REQUIRED', password: 'FIELDS_REQUIRED' });
    expect(validateLogin({ email: 'a@b.c', password: '' })).toEqual({ password: 'FIELDS_REQUIRED' });
    expect(validateLogin({ email: 'a@b.c', password: 'x' })).toEqual({});
  });
});

describe('announcement rules (SRS 3.2.4.2)', () => {
  it('accepts a valid announcement with a point or with an address only', () => {
    expect(validateAnnouncement(validAnnouncement(), true)).toEqual({});
    expect(validateAnnouncement({ ...validAnnouncement(), latitude: null, longitude: null, address: 'Rynok Sq 1, Lviv' }, true)).toEqual({});
  });

  it('checks title 5-100, description 10-2000, category, location and expiry 1-30', () => {
    const errors = validateAnnouncement(
      { title: 'Hey', description: 'short', categoryId: null, address: '', latitude: null, longitude: null, expiryDays: 31, isUrgent: false },
      true,
    );
    expect(errors).toEqual({
      title: 'TITLE_INVALID',
      description: 'DESCRIPTION_INVALID',
      categoryId: 'CATEGORY_INVALID',
      location: 'LOCATION_REQUIRED',
      expiryDays: 'EXPIRY_INVALID',
    });
    expect(validateAnnouncement({ ...validAnnouncement(), title: 'x'.repeat(100), description: 'y'.repeat(2000), expiryDays: 30 }, true)).toEqual({});
    expect(validateAnnouncement({ ...validAnnouncement(), title: 'x'.repeat(101) }, true).title).toBe('TITLE_INVALID');
    expect(validateAnnouncement({ ...validAnnouncement(), description: 'y'.repeat(2001) }, true).description).toBe('DESCRIPTION_INVALID');
    expect(validateAnnouncement({ ...validAnnouncement(), expiryDays: 0 }, true).expiryDays).toBe('EXPIRY_INVALID');
    expect(validateAnnouncement({ ...validAnnouncement(), expiryDays: 1.5 }, true).expiryDays).toBe('EXPIRY_INVALID');
  });

  it('allows the "Urgent" flag for help requests only', () => {
    expect(validateAnnouncement({ ...validAnnouncement(), isUrgent: true }, true)).toEqual({});
    expect(validateAnnouncement({ ...validAnnouncement(), isUrgent: true }, false).isUrgent).toBe('URGENT_NOT_ALLOWED');
  });

  it('accepts JPEG, PNG and WebP up to 10 MB only', () => {
    expect(validatePhoto({ type: 'image/jpeg', size: 1000 })).toBeNull();
    expect(validatePhoto({ type: 'image/png', size: LIMITS.maxPhotoBytes })).toBeNull();
    expect(validatePhoto({ type: 'image/webp', size: 5 })).toBeNull();
    expect(validatePhoto({ type: 'image/gif', size: 1000 })).toBe('PHOTO_INVALID');
    expect(validatePhoto({ type: 'application/pdf', size: 1000 })).toBe('PHOTO_INVALID');
    expect(validatePhoto({ type: 'image/jpeg', size: LIMITS.maxPhotoBytes + 1 })).toBe('PHOTO_INVALID');
    expect(validatePhoto({ type: 'image/jpeg', size: 0 })).toBe('PHOTO_INVALID');
  });
});
