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
});
