import { Logger } from '@nestjs/common';
import type { EntityManager, Repository } from 'typeorm';
import { MailService } from './mail.service';
import { EmailOutbox } from './entities/email-outbox.entity';

describe('MailService outbox', () => {
  let repository: any;
  let driver: { send: jest.Mock };
  let service: MailService;
  beforeEach(() => {
    repository = { query: jest.fn(), update: jest.fn(), delete: jest.fn() };
    driver = { send: jest.fn().mockResolvedValue(undefined) };
    service = new MailService(repository as Repository<EmailOutbox>, driver);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });
  it('enqueues a message using the supplied transaction manager', async () => {
    const manager = {
      create: jest.fn((_entity, value) => value),
      save: jest
        .fn()
        .mockImplementation(async (value) => ({ id: 'outbox-id', ...value })),
    };
    expect(
      await service.enqueue(
        manager as unknown as EntityManager,
        { to: 'recipient@test.com', subject: 'Subject', text: 'Body' },
        'activation',
      ),
    ).toMatchObject({
      id: 'outbox-id',
      toAddress: 'recipient@test.com',
      htmlBody: null,
      kind: 'activation',
    });
    expect(driver.send).not.toHaveBeenCalled();
  });
  it('delivers a claimed message and records successful delivery', async () => {
    repository.query.mockResolvedValue([
      [
        {
          id: 'mail',
          to_address: 'recipient@test.com',
          subject: 'Subject',
          text_body: 'Body',
          html_body: '<p>Body</p>',
          attempts: 2,
        },
      ],
      1,
    ]);
    expect(await service.deliver('mail')).toBe(true);
    expect(driver.send).toHaveBeenCalledWith({
      to: 'recipient@test.com',
      subject: 'Subject',
      text: 'Body',
      html: '<p>Body</p>',
    });
    expect(repository.update).toHaveBeenCalledWith('mail', {
      sentAt: expect.any(Date),
      attempts: 3,
      lastError: null,
    });
  });
  it('does not send a message already claimed or delivered by another worker', async () => {
    repository.query.mockResolvedValue([[], 0]);
    expect(await service.deliver('mail')).toBe(false);
    expect(driver.send).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });
  it.each([
    [0, 1],
    [1, 2],
    [4, 30],
    [9, 360],
  ])(
    'retries failure %s after %s minutes and truncates error details',
    async (attempts, minutes) => {
      jest.spyOn(Date, 'now').mockReturnValue(1000);
      repository.query.mockResolvedValue([[{ id: 'mail', attempts }], 1]);
      driver.send.mockRejectedValue(new Error('x'.repeat(1500)));
      expect(await service.deliver('mail')).toBe(false);
      expect(repository.update).toHaveBeenCalledWith('mail', {
        attempts: attempts + 1,
        lastError: 'x'.repeat(1000),
        nextAttemptAt: new Date(1000 + minutes * 60000),
      });
    },
  );
  it('counts successful scheduled retries and purges delivered messages', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]),
    };
    repository.createQueryBuilder = jest.fn(() => query);
    jest
      .spyOn(service, 'deliver')
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    expect(await service.retryPending()).toBe(1);
    expect(query.limit).toHaveBeenCalledWith(50);
    await service.purgeDelivered();
    expect(repository.delete).toHaveBeenCalledTimes(1);
  });
});
