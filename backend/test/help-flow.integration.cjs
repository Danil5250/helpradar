const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { Test } = require('@nestjs/testing');
const { DataSource } = require('typeorm');
const { loadAppConfig, isLocalHost } = require('../dist/config/app.config');
const { configureApp } = require('../dist/app.setup');
const {
  AlignHelpResponseStatuses1794100004000,
} = require('../dist/migrations/1794100004000-AlignHelpResponseStatuses');
const {
  FileStorage,
  LocalFileStorage,
} = require('../dist/modules/storage/file-storage');
const {
  GeocodingProvider,
} = require('../dist/modules/geocoding/geocoding.provider');
const { User } = require('../dist/modules/users/entities/user.entity');
const {
  Volunteer,
} = require('../dist/modules/users/entities/volunteer.entity');
const {
  PersonInNeed,
} = require('../dist/modules/users/entities/person-in-need.entity');
const {
  Announcement,
} = require('../dist/modules/announcement/entities/announcement.entity');
const {
  AnnouncementService,
} = require('../dist/modules/announcement/announcement.service');

void describe('Help workflow with real HTTP, sessions, PostgreSQL and migrations', () => {
  const config = loadAppConfig();
  const database = `helpradar_help_test_${randomBytes(6).toString('hex')}`;
  let app, admin, db, base, storageDir;
  const actors = {};

  async function api(actor, path, method = 'GET', body) {
    const response = await fetch(`${base}/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Origin: config.appUrl,
        ...(actor ? { Cookie: actor.cookie } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json(), response };
  }

  async function announcement(actor, title = 'A request for help') {
    const result = await api(actor, '/announcements', 'POST', {
      title,
      description: 'A local integration test for the help workflow.',
      categoryId: 1,
      latitude: 50.4501,
      longitude: 30.5234,
    });
    assert.equal(result.status, 201, JSON.stringify(result.body));
    return result.body.announcement;
  }

  async function requestDirectHelp(offerId) {
    const result = await api(
      actors.requester,
      `/announcements/${offerId}/receive-help`,
      'POST',
    );
    assert.equal(result.status, 201, JSON.stringify(result.body));
    return result.body.id;
  }

  before(
    async () => {
      assert(
        isLocalHost(config.db.host),
        'These tests only run against local PostgreSQL.',
      );
      admin = new Client({
        host: config.db.host,
        port: config.db.port,
        user: config.db.username,
        password: config.db.password,
        database: 'postgres',
      });
      await admin.connect();
      await admin.query(`CREATE DATABASE "${database}"`);
      Object.assign(process.env, {
        NODE_ENV: 'test',
        DB_NAME: database,
        DB_MIGRATIONS_RUN: 'true',
        DISABLE_SCHEDULER: 'true',
        MAIL_DRIVER: 'memory',
        AUTH_RATE_LIMIT_PER_MINUTE: '10000',
        RATE_LIMIT_PER_MINUTE: '10000',
      });
      storageDir = await mkdtemp(join(tmpdir(), 'helpradar-integration-'));
      const { AppModule } = require('../dist/app.module');
      const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(FileStorage)
        .useValue(new LocalFileStorage(storageDir))
        .overrideProvider(GeocodingProvider)
        .useValue({ search: async () => [], reverse: async () => null })
        .compile();
      app = moduleRef.createNestApplication({ logger: false });
      configureApp(app, loadAppConfig());
      await app.listen(0, '127.0.0.1');
      base = await app.getUrl();
      db = app.get(DataSource);
      for (const [key, role] of [
        ['requester', 'person_in_need'],
        ['stranger', 'person_in_need'],
        ['volunteer', 'volunteer'],
        ['otherVolunteer', 'volunteer'],
      ]) {
        const user = await db.manager.save(
          User,
          db.manager.create(User, {
            firstName: 'Test',
            lastName: key,
            email: `${key.toLowerCase()}@example.test`,
            role,
            isConfirmedEmail: true,
            password: await bcrypt.hash('HelpRadarTest123', 4),
            phoneNumber: '+380501234567',
          }),
        );
        await db.manager.save(role === 'volunteer' ? Volunteer : PersonInNeed, {
          userId: user.id,
          city: 'Київ',
        });
        const login = await api(null, '/auth/login', 'POST', {
          email: user.email,
          password: 'HelpRadarTest123',
        });
        assert.equal(login.status, 200, JSON.stringify(login.body));
        actors[key] = {
          id: user.id,
          cookie: login.response.headers.get('set-cookie').split(';')[0],
        };
      }
    },
    { timeout: 30000 },
  );

  after(async () => {
    try {
      if (app) await app.close();
    } finally {
      try {
        if (admin) {
          try {
            await admin.query(
              `DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`,
            );
          } finally {
            await admin.end();
          }
        }
      } finally {
        if (storageDir) await rm(storageDir, { recursive: true, force: true });
      }
    }
  });

  void it('requires a session and the correct role', async () => {
    assert.equal((await api(null, '/help')).status, 401);
    const request = await announcement(actors.requester);
    assert.equal(
      (
        await api(
          actors.stranger,
          `/announcements/${request.id}/respond`,
          'POST',
        )
      ).status,
      403,
    );
  });

  void it('connects a volunteer response, recipient confirmation, completion, creation and editing of a review', async () => {
    const request = await announcement(actors.requester);
    const sent = await api(
      actors.volunteer,
      `/announcements/${request.id}/respond`,
      'POST',
    );
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    assert.deepEqual(sent.body.actions, ['withdraw']);
    assert.equal(sent.body.contactPhone, null);
    assert.equal(
      (
        await api(
          actors.volunteer,
          `/announcements/${request.id}/respond`,
          'POST',
        )
      ).status,
      409,
    );
    const id = sent.body.id;
    assert.equal(
      (await api(actors.volunteer, `/help/${id}/accept`, 'POST')).status,
      409,
    );
    const accepted = await api(actors.requester, `/help/${id}/accept`, 'POST');
    assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
    assert.equal(accepted.body.request.status, 'InProgress');
    assert.equal(accepted.body.contactPhone, '+380501234567');
    assert.equal(accepted.body.canReview, false);
    assert.equal(
      (await api(actors.volunteer, `/help/${id}/complete`, 'POST')).status,
      409,
    );
    const completed = await api(
      actors.requester,
      `/help/${id}/complete`,
      'POST',
    );
    assert.equal(completed.status, 200, JSON.stringify(completed.body));
    assert.equal(completed.body.request.status, 'Completed');
    assert.equal(completed.body.canReview, true);
    const review = await api(
      actors.requester,
      `/announcements/${request.id}/comments`,
      'POST',
      { rating: 5, description: 'Thank you for the help!' },
    );
    assert.equal(review.status, 201, JSON.stringify(review.body));
    assert.equal(
      (
        await api(
          actors.stranger,
          `/comments/${review.body.comment.id}`,
          'PATCH',
          { rating: 1 },
        )
      ).status,
      404,
    );
    const edited = await api(
      actors.requester,
      `/comments/${review.body.comment.id}`,
      'PATCH',
      { rating: 4, description: '' },
    );
    assert.equal(edited.status, 200, JSON.stringify(edited.body));
    assert.equal(edited.body.comment.description, '');
    const profile = await api(null, `/users/${actors.volunteer.id}`);
    assert.equal(profile.body.rating, 4);
    assert.equal(profile.body.reviewsCount, 1);
  });

  void it('lets a recipient request help from an offer, with acceptance only by that volunteer', async () => {
    const request = await announcement(actors.requester);
    const offer = await announcement(actors.volunteer, 'An offer to help');
    const invited = await api(
      actors.requester,
      `/announcements/${offer.id}/request-help`,
      'POST',
      { requestId: request.id },
    );
    assert.equal(invited.status, 201, JSON.stringify(invited.body));
    assert.equal(invited.body.initiatedBy, 'requester');
    assert.equal(
      (await api(actors.requester, `/help/${invited.body.id}/accept`, 'POST'))
        .status,
      409,
    );
    const inbox = await api(actors.volunteer, '/help');
    assert(
      inbox.body.items.some(
        (item) =>
          item.id === invited.body.id && item.actions.includes('accept'),
      ),
    );
    const accepted = await api(
      actors.volunteer,
      `/help/${invited.body.id}/accept`,
      'POST',
    );
    assert.equal(accepted.body.request.status, 'InProgress');
    assert.equal(
      (await api(actors.stranger, `/help/${invited.body.id}/complete`, 'POST'))
        .status,
      404,
    );
  });

  void it('blocks deletion of ongoing direct help and lets the recipient finish after the offer is closed', async () => {
    const offer = await announcement(actors.volunteer, 'Direct help offer');
    const path = `/announcements/${offer.id}`;
    const id = await requestDirectHelp(offer.id);
    const pending = await api(actors.volunteer, path);
    assert.equal(pending.body.announcement.deleteBlockedByOngoingHelp, false);
    assert(pending.body.announcement.allowedActions.includes('delete'));

    const accepted = await api(actors.volunteer, `/help/${id}/accept`, 'POST');
    assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
    const blocked = await api(actors.volunteer, path, 'DELETE');
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.code, 'DELETE_IN_PROGRESS');

    const details = (await api(actors.volunteer, path)).body.announcement;
    const owned = (
      await api(actors.volunteer, '/announcements/mine')
    ).body.items.find((item) => item.id === offer.id);
    for (const item of [details, owned]) {
      assert.equal(item.deleteBlockedByOngoingHelp, true);
      assert(!item.allowedActions.includes('delete'));
      assert(item.allowedActions.includes('close'));
    }
    assert.equal(
      (await api(null, path)).body.announcement.deleteBlockedByOngoingHelp,
      false,
    );

    const closed = await api(actors.volunteer, `${path}/close`, 'POST');
    assert.equal(closed.status, 200, JSON.stringify(closed.body));
    assert.equal(closed.body.announcement.status, 'Resolved');
    assert.equal(
      (await api(actors.volunteer, path, 'DELETE')).body.code,
      'DELETE_IN_PROGRESS',
    );

    const completed = await api(
      actors.requester,
      `/help/${id}/complete`,
      'POST',
    );
    assert.equal(completed.status, 200, JSON.stringify(completed.body));
    assert.equal(completed.body.request.status, 'Completed');
    assert.equal(completed.body.canReview, true);
    const readyToDelete = (await api(actors.volunteer, path)).body.announcement;
    assert.equal(readyToDelete.deleteBlockedByOngoingHelp, false);
    assert(readyToDelete.allowedActions.includes('delete'));
    assert.equal((await api(actors.volunteer, path, 'DELETE')).status, 200);
    assert.equal((await api(null, path)).status, 404);
  });

  void it('serializes accepting a direct response with deleting its offer', async () => {
    const offer = await announcement(
      actors.volunteer,
      'Concurrent direct offer',
    );
    const path = `/announcements/${offer.id}`;
    const id = await requestDirectHelp(offer.id);
    const [accepted, deleted] = await Promise.all([
      api(actors.volunteer, `/help/${id}/accept`, 'POST'),
      api(actors.volunteer, path, 'DELETE'),
    ]);
    assert.deepEqual(
      [accepted.status, deleted.status].sort((a, b) => a - b),
      [200, 409],
    );
    if (accepted.status === 200) {
      assert.equal(deleted.body.code, 'DELETE_IN_PROGRESS');
      assert.equal(
        (await api(actors.volunteer, `/help/${id}/cancel`, 'POST')).status,
        200,
      );
      assert.equal((await api(actors.volunteer, path, 'DELETE')).status, 200);
    }
    assert.equal((await api(null, path)).status, 404);
  });

  void it('skips stale offers with ongoing direct help during scheduled deletion', async () => {
    const offer = await announcement(actors.volunteer, 'Stale direct offer');
    const id = await requestDirectHelp(offer.id);
    assert.equal(
      (await api(actors.volunteer, `/help/${id}/accept`, 'POST')).status,
      200,
    );
    await db.manager.update(Announcement, offer.id, {
      status: 'Closed',
      closedAt: new Date(Date.now() - 31 * 86_400_000),
    });

    const announcements = app.get(AnnouncementService);
    await announcements.deleteStaleClosed();
    const path = `/announcements/${offer.id}`;
    assert.equal(
      (await api(actors.volunteer, path)).body.announcement.status,
      'Closed',
    );
    assert.equal(
      (await api(actors.volunteer, `/help/${id}/cancel`, 'POST')).status,
      200,
    );
    await announcements.deleteStaleClosed();
    assert.equal((await api(null, path)).status, 404);
  });

  void it('lets both participants recover ongoing help on an already deleted offer', async () => {
    const offer = await announcement(
      actors.volunteer,
      'Already deleted direct offer',
    );
    const id = await requestDirectHelp(offer.id);
    assert.equal(
      (await api(actors.volunteer, `/help/${id}/accept`, 'POST')).status,
      200,
    );
    await db.manager.update(Announcement, offer.id, { status: 'Deleted' });

    for (const [actor, actions] of [
      [actors.requester, ['complete', 'cancel']],
      [actors.volunteer, ['cancel']],
    ]) {
      const inbox = await api(actor, '/help');
      const connection = inbox.body.items.find((item) => item.id === id);
      assert.equal(connection.request.status, 'InProgress');
      assert.equal(connection.request.announcementDeleted, true);
      assert.deepEqual(connection.actions, actions);
    }
    assert(
      !(await api(actors.stranger, '/help')).body.items.some(
        (item) => item.id === id,
      ),
    );
    assert.equal(
      (await api(actors.stranger, `/help/${id}/cancel`, 'POST')).status,
      404,
    );
    assert.equal((await api(null, `/announcements/${offer.id}`)).status, 404);
    assert.equal(
      (
        await api(
          actors.stranger,
          `/announcements/${offer.id}/receive-help`,
          'POST',
        )
      ).status,
      409,
    );
    const completed = await api(
      actors.requester,
      `/help/${id}/complete`,
      'POST',
    );
    assert.equal(completed.status, 200, JSON.stringify(completed.body));
    assert.equal(completed.body.request.status, 'Completed');
    assert(
      (await api(actors.volunteer, '/help')).body.items.some(
        (item) => item.id === id,
      ),
    );
  });

  void it('does not expose responses or contact details to unrelated users', async () => {
    const request = await announcement(actors.requester);
    const sent = await api(
      actors.volunteer,
      `/announcements/${request.id}/respond`,
      'POST',
    );
    const overview = await api(
      actors.stranger,
      `/announcements/${request.id}/help`,
    );
    assert.deepEqual(overview.body.connections, []);
    assert.equal(
      (await api(actors.stranger, `/help/${sent.body.id}/accept`, 'POST'))
        .status,
      404,
    );
    const offer = await announcement(actors.volunteer, 'Another offer to help');
    assert.equal(
      (
        await api(
          actors.stranger,
          `/announcements/${offer.id}/request-help`,
          'POST',
          { requestId: request.id },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await api(
          actors.requester,
          `/announcements/${offer.id}/request-help`,
          'POST',
          {},
        )
      ).status,
      400,
    );
  });

  void it('selects exactly one volunteer when two accept requests race', async () => {
    const request = await announcement(actors.requester);
    const a = await api(
      actors.volunteer,
      `/announcements/${request.id}/respond`,
      'POST',
    );
    const b = await api(
      actors.otherVolunteer,
      `/announcements/${request.id}/respond`,
      'POST',
    );
    const results = await Promise.all(
      [a, b].map((row) =>
        api(actors.requester, `/help/${row.body.id}/accept`, 'POST'),
      ),
    );
    assert.deepEqual(
      results.map((result) => result.status).sort((a, b) => a - b),
      [200, 409],
    );
    const overview = await api(
      actors.requester,
      `/announcements/${request.id}/help`,
    );
    assert.equal(
      overview.body.connections.filter((row) => row.status === 'Accepted')
        .length,
      1,
    );
    assert.equal(
      overview.body.connections.filter((row) => row.status === 'Rejected')
        .length,
      1,
    );
  });

  void it('supports withdrawal, decline and cancellation without allowing a false review', async () => {
    const request = await announcement(actors.requester);
    let sent = await api(
      actors.volunteer,
      `/announcements/${request.id}/respond`,
      'POST',
    );
    assert.equal(
      (await api(actors.volunteer, `/help/${sent.body.id}/withdraw`, 'POST'))
        .body.status,
      'Rejected',
    );
    sent = await api(
      actors.volunteer,
      `/announcements/${request.id}/respond`,
      'POST',
    );
    assert.equal(
      (await api(actors.requester, `/help/${sent.body.id}/decline`, 'POST'))
        .body.status,
      'Rejected',
    );
    sent = await api(
      actors.volunteer,
      `/announcements/${request.id}/respond`,
      'POST',
    );
    await api(actors.requester, `/help/${sent.body.id}/accept`, 'POST');
    const cancelled = await api(
      actors.volunteer,
      `/help/${sent.body.id}/cancel`,
      'POST',
    );
    assert.equal(cancelled.body.request.status, 'Active');
    assert.equal(cancelled.body.contactPhone, null);
    assert.equal(cancelled.body.canReview, false);
    assert.equal(
      (
        await api(
          actors.requester,
          `/announcements/${request.id}/comments`,
          'POST',
          { rating: 5 },
        )
      ).status,
      403,
    );
  });

  void it('rejects responses on expired requests', async () => {
    const request = await announcement(actors.requester);
    await db.manager.update(Announcement, request.id, {
      datePosted: new Date(Date.now() - 86400000),
      expiresAt: new Date(Date.now() - 1000),
    });
    assert.equal(
      (
        await api(
          actors.volunteer,
          `/announcements/${request.id}/respond`,
          'POST',
        )
      ).status,
      409,
    );
  });

  void it('migrates legacy rejection states while preserving response rows', async () => {
    const rows = await db.query(
      `SELECT id FROM help_responses WHERE status = 'Rejected' ORDER BY id LIMIT 2`,
    );
    assert.equal(rows.length, 2);
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      const migration = new AlignHelpResponseStatuses1794100004000();
      await migration.down(runner);
      await runner.query(
        `UPDATE help_responses SET status = 'Withdrawn' WHERE id = $1`,
        [rows[0].id],
      );
      await migration.up(runner);
      const upgraded = await runner.query(
        `SELECT id, status FROM help_responses WHERE id = ANY($1::int[]) ORDER BY id`,
        [rows.map((row) => row.id)],
      );
      assert.deepEqual(
        upgraded,
        rows.map((row) => ({ id: row.id, status: 'Rejected' })),
      );
    } finally {
      try {
        if (runner.isTransactionActive) await runner.rollbackTransaction();
      } finally {
        await runner.release();
      }
    }
  });

  void it('edits and resolves an owned request, removes its map marker, and keeps its shared link readable', async () => {
    const request = await announcement(
      actors.stranger,
      'Sprint acceptance request',
    );
    const path = `/announcements/${request.id}`;
    assert.equal(
      (await api(actors.volunteer, path, 'PATCH', { title: 'Foreign change' }))
        .status,
      403,
    );
    assert.equal(
      (await api(actors.stranger, path, 'PATCH', { title: '' })).status,
      400,
    );
    const edited = await api(actors.stranger, path, 'PATCH', {
      title: 'Updated request title',
      description: 'Updated details for the map popup and public link.',
    });
    assert.equal(edited.status, 200, JSON.stringify(edited.body));
    assert.equal(
      (await api(null, path)).body.announcement.title,
      'Updated request title',
    );
    const query =
      '/announcements/map?lat=50.45&lng=30.52&radius=1&north=50.46&south=50.44&east=30.54&west=30.50';
    const visible = await api(actors.stranger, query);
    assert.equal(visible.status, 200, JSON.stringify(visible.body));
    const marker = visible.body.items.find((item) => item.id === request.id);
    assert(marker, 'The author must also see their request on the map.');
    assert.deepEqual(marker.location, {
      latitude: 50.4501,
      longitude: 30.5234,
    });
    assert.equal(
      marker.description,
      'Updated details for the map popup and public link.',
    );
    const resolved = await api(actors.stranger, `${path}/close`, 'POST');
    assert.equal(resolved.status, 200, JSON.stringify(resolved.body));
    assert.equal(resolved.body.announcement.status, 'Resolved');
    assert(
      !(await api(null, query)).body.items.some(
        (item) => item.id === request.id,
      ),
    );
    assert(
      !(await api(actors.volunteer, '/announcements')).body.items.some(
        (item) => item.id === request.id,
      ),
    );
    assert.equal((await api(null, path)).body.announcement.status, 'Resolved');
    assert.equal(
      (await api(actors.stranger, '/announcements/mine')).body.items.find(
        (item) => item.id === request.id,
      ).status,
      'Resolved',
    );
    const republished = await api(
      actors.stranger,
      `${path}/republish`,
      'POST',
      {},
    );
    assert.equal(republished.status, 200, JSON.stringify(republished.body));
    assert.equal(republished.body.announcement.status, 'Active');
    assert.equal((await api(actors.stranger, path, 'DELETE')).status, 200);
    assert.equal((await api(null, path)).body.code, 'ANNOUNCEMENT_UNAVAILABLE');
  });

  void it('returns every viewport marker in pages, including points outside the initial radius', async () => {
    const title = 'Viewport pagination fixture';
    try {
      await db.manager.insert(
        Announcement,
        Array.from({ length: 501 }, () => ({
          type: 'HelpRequest',
          title,
          description: 'A request visible in the new map viewport.',
          categoryId: 1,
          userId: actors.stranger.id,
          latitude: 51.5,
          longitude: 31.5,
          approxLatitude: 51.501,
          approxLongitude: 31.501,
          status: 'Active',
          datePosted: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        })),
      );
      const query =
        '/announcements/map?lat=50.45&lng=30.52&radius=1&north=51.51&south=51.49&east=31.51&west=31.49';
      const first = await api(actors.stranger, query);
      assert.equal(first.status, 200, JSON.stringify(first.body));
      assert.equal(first.body.total, 501);
      assert.equal(first.body.items.length, 500);
      assert.equal(first.body.hasMore, true);
      const second = await api(actors.stranger, `${query}&page=2`);
      assert.equal(second.body.items.length, 1);
      assert.equal(second.body.hasMore, false);
      assert.equal(
        new Set(
          [...first.body.items, ...second.body.items].map((item) => item.id),
        ).size,
        501,
      );
      assert.equal(
        (await api(null, '/announcements/map?lat=50&lng=30&radius=1&north=51'))
          .status,
        400,
      );
      assert.equal(
        (
          await api(
            null,
            '/announcements/map?lat=50&lng=30&radius=1&north=49&south=51&east=31&west=29',
          )
        ).status,
        400,
      );
    } finally {
      await db.manager.delete(Announcement, { title });
    }
  });

  void it('persists profile edits and exposes updated identity and contacts to other users', async () => {
    assert.equal(
      (await api(null, '/profile', 'PATCH', { firstName: 'Guest' })).status,
      401,
    );
    const changed = await api(actors.stranger, '/profile', 'PATCH', {
      firstName: 'Olena',
      lastName: 'Shevchenko',
      phoneNumber: '+380671234567',
    });
    assert.equal(changed.status, 200, JSON.stringify(changed.body));
    assert.equal(
      (await api(actors.stranger, '/profile')).body.firstName,
      'Olena',
    );
    const publicProfile = await api(
      actors.volunteer,
      `/users/${actors.stranger.id}`,
    );
    assert.equal(publicProfile.body.name, 'Olena Shevchenko');
    assert.equal(publicProfile.body.phoneNumber, '+380671234567');
    assert.equal(publicProfile.body.email, 'stranger@example.test');
    assert.equal(
      (
        await api(actors.stranger, '/profile', 'PATCH', {
          firstName: '',
          phoneNumber: 'invalid',
        })
      ).status,
      400,
    );
    assert.equal(
      (await api(null, `/users/${actors.stranger.id}`)).body.name,
      'Olena Shevchenko',
    );
  });
});
