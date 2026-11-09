import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { configureApp } from '../../app.setup';
import appConfig, { loadAppConfig } from '../../config/app.config';
import { RateLimiterService } from '../../common/rate-limiter.service';
import { SessionService } from '../auth/session.service';
import { Role } from '../users/enums/role.enum';
import { AppException } from '../../common/errors';
import { AnnouncementController } from './announcement.controller';
import { AnnouncementService } from './announcement.service';

describe('Announcement HTTP contract (mocked business services)', () => {
  let app: NestExpressApplication;
  let service: any;
  const actor = { id: 1, role: Role.PersonInNeed, isConfirmedEmail: true };
  beforeAll(async () => {
    service = Object.fromEntries(
      [
        'findAll',
        'findForMap',
        'findMine',
        'getDetails',
        'create',
        'update',
        'close',
        'extend',
        'republish',
        'remove',
        'addPhoto',
        'removePhoto',
      ].map((name) => [name, jest.fn()]),
    );
    const config = loadAppConfig({});
    const module = await Test.createTestingModule({
      controllers: [AnnouncementController],
      providers: [
        { provide: AnnouncementService, useValue: service },
        {
          provide: SessionService,
          useValue: {
            validate: jest.fn(async (token: string) =>
              token === 'valid' ? actor : null,
            ),
          },
        },
        { provide: RateLimiterService, useValue: { hit: () => 0 } },
        { provide: appConfig.KEY, useValue: config },
      ],
    }).compile();
    app = module.createNestApplication<NestExpressApplication>();
    configureApp(app, config);
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    for (const mock of Object.values(service) as jest.Mock[]) mock.mockReset();
    service.findAll.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      hasMore: false,
    });
    service.findMine.mockResolvedValue([{ id: 7 }]);
    service.findForMap.mockResolvedValue({ items: [], total: 0, radiusKm: 5 });
    for (const name of [
      'getDetails',
      'create',
      'update',
      'close',
      'extend',
      'republish',
    ])
      service[name].mockResolvedValue({ id: 7 });
  });
  it('allows guests and transforms discovery query strings', async () => {
    const result = await request(app.getHttpServer()).get(
      '/api/announcements?page=2&lat=50&lng=30&radius=5&sort=nearest',
    );
    expect(result.status).toBe(200);
    expect(result.body.items).toEqual([]);
    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        lat: 50,
        lng: 30,
        radius: 5,
        sort: 'nearest',
      }),
      undefined,
    );
  });
  it('routes mine and map before the dynamic id route', async () => {
    const mine = await request(app.getHttpServer())
      .get('/api/announcements/mine')
      .auth('valid', { type: 'bearer' });
    expect(mine.status).toBe(200);
    expect(mine.body).toEqual({ items: [{ id: 7 }] });
    expect(service.findMine).toHaveBeenCalledWith(actor);
    const map = await request(app.getHttpServer()).get(
      '/api/announcements/map?lat=50&lng=30&radius=5',
    );
    expect(map.status).toBe(200);
    expect(service.findForMap).toHaveBeenCalledWith(
      expect.objectContaining({ lat: 50, lng: 30, radius: 5 }),
      undefined,
    );
    expect(service.getDetails).not.toHaveBeenCalled();
  });
  it.each([
    '?page=0',
    '?lat=100',
    '?radius=2',
    '?extra=1',
    '/map?lat=50&lng=30',
    '/invalid',
  ])('rejects invalid request %s before service execution', async (suffix) => {
    const result = await request(app.getHttpServer()).get(
      '/api/announcements' + suffix,
    );
    expect(result.status).toBe(suffix === '/invalid' ? 404 : 400);
    expect(service.findAll).not.toHaveBeenCalled();
    expect(service.findForMap).not.toHaveBeenCalled();
    expect(service.getDetails).not.toHaveBeenCalled();
  });
  it.each(['post', 'patch', 'delete'] as const)(
    'requires a session for %s mutations',
    async (method) => {
      const result = await request(app.getHttpServer())[method](
        method === 'post' ? '/api/announcements' : '/api/announcements/7',
      );
      expect(result.status).toBe(401);
      expect(result.body.code).toBe('UNAUTHORIZED');
      expect(service.update).not.toHaveBeenCalled();
      expect(service.remove).not.toHaveBeenCalled();
    },
  );
  it.each([
    ['extend', { days: 15 }],
    ['republish', { expiryDays: 31 }],
  ] as const)('validates %s expiry limits', async (action, body) => {
    const result = await request(app.getHttpServer())
      .post(`/api/announcements/7/${action}`)
      .auth('valid', { type: 'bearer' })
      .send(body);
    expect(result.status).toBe(400);
    expect(result.body.code).toBe('VALIDATION_FAILED');
    expect(service[action]).not.toHaveBeenCalled();
  });
  it('returns creation envelopes and forwards authenticated identity', async () => {
    const dto = {
      title: 'Please help',
      description: 'Food is needed for our family.',
      categoryId: 1,
      latitude: 50,
      longitude: 30,
    };
    const result = await request(app.getHttpServer())
      .post('/api/announcements')
      .auth('valid', { type: 'bearer' })
      .send(dto);
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({
      code: 'ANNOUNCEMENT_PUBLISHED',
      announcement: { id: 7 },
    });
    expect(service.create).toHaveBeenCalledWith(
      actor,
      expect.objectContaining(dto),
    );
  });
  it('preserves business errors rather than returning success envelopes', async () => {
    service.close.mockRejectedValue(new AppException('NOT_AUTHOR'));
    const result = await request(app.getHttpServer())
      .post('/api/announcements/7/close')
      .auth('valid', { type: 'bearer' });
    expect(result.status).toBe(403);
    expect(result.body.code).toBe('NOT_AUTHOR');
  });
  it.each([
    ['close', {}, 'ANNOUNCEMENT_CLOSED'],
    ['extend', { days: '3' }, 'ANNOUNCEMENT_EXTENDED'],
    ['republish', { expiryDays: '7' }, 'ANNOUNCEMENT_PUBLISHED'],
  ])(
    'returns the %s success contract with validated input',
    async (action, body, code) => {
      const result = await request(app.getHttpServer())
        .post(`/api/announcements/7/${action}`)
        .auth('valid', { type: 'bearer' })
        .send(body);
      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({ code, announcement: { id: 7 } });
      expect(service[action]).toHaveBeenCalledWith(
        actor,
        7,
        ...(action === 'close' ? [] : [action === 'extend' ? 3 : 7]),
      );
    },
  );
  it('converts unexpected upload fields into the photo error contract', async () => {
    const result = await request(app.getHttpServer())
      .post('/api/announcements/7/photos')
      .auth('valid', { type: 'bearer' })
      .attach('wrong', Buffer.from('image'), 'photo.png');
    expect(result.status).toBe(400);
    expect(result.body.code).toBe('PHOTO_INVALID');
    expect(service.addPhoto).not.toHaveBeenCalled();
  });
  it('rejects oversized uploads before invoking the service', async () => {
    const result = await request(app.getHttpServer())
      .post('/api/announcements/7/photos')
      .auth('valid', { type: 'bearer' })
      .attach('photo', Buffer.alloc(10 * 1024 * 1024 + 1), 'photo.png');
    expect(result.status).toBe(400);
    expect(result.body.code).toBe('PHOTO_INVALID');
    expect(service.addPhoto).not.toHaveBeenCalled();
  });
});
