import type { Repository } from 'typeorm';
import {
  UsersService,
  normalizeEmail,
  isBlocked,
  blockedException,
} from './users.service';
import { User } from './entities/user.entity';
import { Volunteer } from './entities/volunteer.entity';
import { PersonInNeed } from './entities/person-in-need.entity';
import { Role } from './enums/role.enum';
import { SignedUrlService } from '../storage/signed-url.service';

describe('UsersService', () => {
  const users = { findOneBy: jest.fn() };
  const volunteers = { findOneBy: jest.fn() };
  const recipients = { findOneBy: jest.fn() };
  const signer = { resolve: jest.fn().mockReturnValue('/signed-avatar') };
  const service = new UsersService(
    users as unknown as Repository<User>,
    recipients as unknown as Repository<PersonInNeed>,
    volunteers as unknown as Repository<Volunteer>,
    signer as unknown as SignedUrlService,
  );
  it('normalizes email lookups', async () => {
    users.findOneBy.mockResolvedValue(null);
    expect(normalizeEmail(' Test@Example.COM ')).toBe('test@example.com');
    expect(await service.findByEmail(' Test@Example.COM ')).toBeNull();
    expect(users.findOneBy).toHaveBeenCalledWith({ email: 'test@example.com' });
    await service.findById(7);
    expect(users.findOneBy).toHaveBeenCalledWith({ id: 7 });
  });
  it('returns role-specific cities and safe public session fields', async () => {
    volunteers.findOneBy.mockResolvedValue({ city: 'Lviv' });
    recipients.findOneBy.mockResolvedValue({ city: 'Kyiv' });
    expect(await service.getCity({ id: 1, role: Role.Volunteer })).toBe('Lviv');
    expect(await service.getCity({ id: 2, role: Role.PersonInNeed })).toBe(
      'Kyiv',
    );
    expect(
      await service.getCity({ id: 3, role: Role.Administrator }),
    ).toBeNull();
    const view = await service.toView({
      id: 1,
      firstName: 'Anna',
      lastName: 'Test',
      email: 'a@example.test',
      password: 'hidden',
      role: Role.Volunteer,
      phoneNumber: null,
      avatarUrl: 'stored',
    } as User);
    expect(view).toMatchObject({
      id: 1,
      city: 'Lviv',
      avatarUrl: '/signed-avatar',
    });
    expect(view).not.toHaveProperty('password');
    volunteers.findOneBy.mockResolvedValue(null);
    recipients.findOneBy.mockResolvedValue(null);
    expect(await service.getCity({ id: 1, role: Role.Volunteer })).toBeNull();
    expect(
      await service.getCity({ id: 1, role: Role.PersonInNeed }),
    ).toBeNull();
  });
  it('expires account blocks at their exact boundary and supplies a fallback reason', () => {
    const until = new Date('2026-01-01');
    expect(
      isBlocked({ blockedUntil: until }, new Date(until.getTime() - 1)),
    ).toBe(true);
    expect(isBlocked({ blockedUntil: until }, until)).toBe(false);
    expect(isBlocked({ blockedUntil: null })).toBe(false);
    expect(
      blockedException({
        blockedUntil: until,
        blockReason: null,
      }).getResponse(),
    ).toMatchObject({
      code: 'ACCOUNT_BLOCKED',
      reason: null,
      message: expect.stringContaining('not specified'),
    });
  });
});
