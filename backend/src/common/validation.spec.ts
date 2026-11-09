import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';
import {
  buildValidationPipe,
  NAME_REGEX,
  PASSWORD_REGEX,
  PHONE_REGEX,
  v,
} from './validation';
import { RegisterRequestDto } from '../modules/auth/dto/register.request.dto';
import { CreateAnnouncementRequestDto } from '../modules/announcement/dto/create-announcement.request.dto';
import { UpdateProfileRequestDto } from '../modules/profile/dto/update-profile.request.dto';
import { ParseUserIdPipe } from '../modules/users/parse-user-id.pipe';
import { ParseAnnouncementIdPipe } from '../modules/announcement/parse-announcement-id.pipe';
import { ParseCommentIdPipe } from '../modules/comments/parse-comment-id.pipe';

class ChildDto {
  @IsString(v('TEXT_INVALID', 'Text required')) text: string;
}
class ParentDto {
  @ValidateNested() @Type(() => ChildDto) child: ChildDto;
}

describe('Request validation', () => {
  const pipe = buildValidationPipe();
  const registration = {
    firstName: ' Anna ',
    lastName: ' Test ',
    email: 'anna@example.test',
    password: 'Secret123',
    passwordConfirm: 'Secret123',
    role: 'volunteer',
    city: ' Kyiv ',
    phoneNumber: ' ',
    termsAccepted: true,
    ageConfirmed: true,
  };
  it('normalizes registration strings and accepts Unicode names', async () => {
    const result = await pipe.transform(registration, {
      type: 'body',
      metatype: RegisterRequestDto,
    });
    expect(result).toMatchObject({
      firstName: 'Anna',
      lastName: 'Test',
      city: 'Kyiv',
      phoneNumber: undefined,
    });
    expect(NAME_REGEX.test('Олена Шевченко')).toBe(true);
    expect(NAME_REGEX.test("O'Connor-Shevchenko")).toBe(true);
    expect(NAME_REGEX.test('123')).toBe(false);
    expect(PASSWORD_REGEX.test('Secret123')).toBe(true);
    expect(PASSWORD_REGEX.test('password')).toBe(false);
    expect(PHONE_REGEX.test('+380501234567')).toBe(true);
    expect(PHONE_REGEX.test('0501234567')).toBe(false);
  });
  it('reports password mismatch and unknown fields using stable field codes', async () => {
    await expect(
      pipe.transform(
        { ...registration, passwordConfirm: 'Different123' },
        { type: 'body', metatype: RegisterRequestDto },
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'VALIDATION_FAILED',
        fields: { passwordConfirm: { code: 'PASSWORDS_MISMATCH' } },
      },
    });
    await expect(
      pipe.transform(
        { ...registration, extra: true },
        { type: 'body', metatype: RegisterRequestDto },
      ),
    ).rejects.toMatchObject({
      response: { fields: { extra: { code: 'UNKNOWN_FIELD' } } },
    });
  });
  it('uses dotted paths for nested validation errors', async () => {
    await expect(
      pipe.transform(
        { child: { text: 42 } },
        { type: 'body', metatype: ParentDto },
      ),
    ).rejects.toMatchObject({
      response: { fields: { 'child.text': { code: 'TEXT_INVALID' } } },
    });
  });
  it('converts numeric announcement fields and empty phone numbers', async () => {
    const result = await pipe.transform(
      {
        title: ' Need help ',
        description: ' A valid description ',
        categoryId: '1',
        latitude: '50.45',
        longitude: '30.52',
        expiryDays: '7',
      },
      { type: 'body', metatype: CreateAnnouncementRequestDto },
    );
    expect(result).toMatchObject({
      title: 'Need help',
      categoryId: 1,
      latitude: 50.45,
      expiryDays: 7,
    });
    expect(
      await pipe.transform(
        { phoneNumber: ' ' },
        { type: 'body', metatype: UpdateProfileRequestDto },
      ),
    ).toMatchObject({ phoneNumber: null });
  });
  it.each([
    new ParseUserIdPipe(),
    new ParseAnnouncementIdPipe(),
    new ParseCommentIdPipe(),
  ])(
    'accepts bounded numeric identifiers and rejects malformed input (%#)',
    (idPipe) => {
      expect(idPipe.transform('123')).toBe(123);
      for (const value of ['-1', '1.5', '1e3', ' 1', 'abc', '1000000000', ''])
        expect(() => idPipe.transform(value)).toThrow();
    },
  );
});
