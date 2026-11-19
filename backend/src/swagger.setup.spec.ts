import { Controller, Get } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from './app.setup';
import { loadAppConfig } from './config/app.config';
import { configureSwagger } from './swagger.setup';

@Controller('ping')
class PingController {
  @Get()
  ping() {
    return { status: 'ok' };
  }
}

async function createApp(env: NodeJS.ProcessEnv) {
  const config = loadAppConfig(env);
  const module = await Test.createTestingModule({
    controllers: [PingController],
  }).compile();
  const app = module.createNestApplication<NestExpressApplication>();
  configureApp(app, config);
  configureSwagger(app, config.swagger);
  await app.init();
  return app;
}

describe('Swagger HTTP authentication', () => {
  const username = 'mentor';
  const password = 'test:password';
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createApp({
      SWAGGER_USERNAME: username,
      SWAGGER_PASSWORD: password,
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each([
    '/api/docs',
    '/api/docs/',
    '/api/docs/index.html',
    '/api/docs/swagger-ui-init.js',
    '/api/docs/docs/swagger-ui-init.js',
    '/api/docs/swagger-ui-bundle.js',
    '/api/docs-json',
    '/api/docs-yaml',
  ])('requires Basic Auth at %s', async (path) => {
    const api = request(app.getHttpServer());
    await api
      .get(path)
      .expect('WWW-Authenticate', /^Basic /)
      .expect(401);
    await api
      .get(path)
      .auth(username, password)
      .expect('Cache-Control', 'no-store')
      .expect(200);
  });

  it('rejects incorrect credentials and API session tokens', async () => {
    const api = request(app.getHttpServer());
    await api.get('/api/docs').auth(username, 'wrong').expect(401);
    await api
      .get('/api/docs')
      .auth('session-token', { type: 'bearer' })
      .expect(401);
  });

  it('allows requests to ordinary API routes without Swagger credentials', async () => {
    await request(app.getHttpServer()).get('/api/ping').expect(200);
  });

  it('does not serve Swagger when credentials are incomplete', async () => {
    const disabled = await createApp({ SWAGGER_USERNAME: username });
    try {
      const api = request(disabled.getHttpServer());
      for (const path of ['/api/docs', '/api/docs-json', '/api/docs-yaml']) {
        await api.get(path).expect(404);
      }
      await api.get('/api/ping').expect(200);
    } finally {
      await disabled.close();
    }
  });
});
