import { Logger } from '@nestjs/common';
import { AuthTasks } from './auth.tasks';
import { AuthService } from './auth.service';
import { AnnouncementTasks } from '../announcement/announcement.tasks';
import { AnnouncementService } from '../announcement/announcement.service';

describe('Scheduled task handlers', () => {
  it('runs account and token cleanup and reports actual removals', async () => {
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {});
    const auth = {
      purgeUnverifiedAccounts: jest
        .fn()
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(2),
      purgeExpiredTokens: jest.fn().mockResolvedValue(undefined),
    };
    const tasks = new AuthTasks(auth as unknown as AuthService);
    await tasks.purgeUnverifiedAccounts();
    expect(log).not.toHaveBeenCalled();
    await tasks.purgeUnverifiedAccounts();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('2 account(s)'));
    await tasks.purgeExpiredTokens();
    expect(auth.purgeExpiredTokens).toHaveBeenCalledTimes(1);
  });
  it('runs announcement cleanup and propagates failures to its caller', async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    const announcements = {
      closeExpired: jest.fn().mockResolvedValue(2),
      sendExpiryReminders: jest.fn().mockResolvedValue(1),
      deleteStaleClosed: jest.fn().mockResolvedValue(3),
    };
    const tasks = new AnnouncementTasks(
      announcements as unknown as AnnouncementService,
    );
    await tasks.closeExpired();
    await tasks.sendExpiryReminders();
    await tasks.deleteStaleClosed();
    expect(announcements.closeExpired).toHaveBeenCalledTimes(1);
    expect(announcements.sendExpiryReminders).toHaveBeenCalledTimes(1);
    expect(announcements.deleteStaleClosed).toHaveBeenCalledTimes(1);
    announcements.closeExpired.mockRejectedValue(
      new Error('database unavailable'),
    );
    await expect(tasks.closeExpired()).rejects.toThrow('database unavailable');
  });
});
