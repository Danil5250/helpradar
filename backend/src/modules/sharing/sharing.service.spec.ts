import type { Repository } from 'typeorm';
import { SharingService } from './sharing.service';
import { Announcement } from '../announcement/entities/announcement.entity';
import { AnnouncementStatus } from '../announcement/enums/announcement-status.enum';
import { AnnouncementShare } from './entities/announcement-share.entity';

describe('SharingService', () => {
  const shares = { query: jest.fn().mockResolvedValue([]) };
  const announcements = { findOne: jest.fn() };
  const service = new SharingService(
    announcements as unknown as Repository<Announcement>,
    shares as unknown as Repository<AnnouncementShare>,
  );
  it('records a share with one atomic increment query', async () => {
    announcements.findOne.mockResolvedValue({
      status: AnnouncementStatus.Active,
      user: { blockedUntil: null },
    });
    await service.record(12, 'copy');
    expect(shares.query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT'),
      [12, 'copy'],
    );
  });
  it.each([
    null,
    { status: AnnouncementStatus.Hidden, user: {} },
    { status: AnnouncementStatus.Deleted, user: {} },
    {
      status: AnnouncementStatus.Active,
      user: { blockedUntil: new Date('2100-01-01') },
    },
  ])(
    'rejects unavailable announcements without recording a share (%#)',
    async (announcement) => {
      announcements.findOne.mockResolvedValue(announcement);
      await expect(service.record(12, 'email')).rejects.toMatchObject({
        code: 'ANNOUNCEMENT_UNAVAILABLE',
      });
      expect(shares.query).not.toHaveBeenCalled();
    },
  );
});
