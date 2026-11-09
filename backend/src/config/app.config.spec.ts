import { isLocalHost, loadAppConfig } from './app.config';
import { assertSafeDatabase, buildDataSourceOptions } from './database.config';

describe('Application configuration', () => {
  it('provides deterministic defaults', () => {
    expect(loadAppConfig({})).toMatchObject({
      nodeEnv: 'development',
      isTest: false,
      appUrl: 'http://localhost:5173',
      db: { database: 'helpradar', ssl: false },
      mail: { driver: 'log' },
    });
  });
  it('parses booleans, numbers, lists, mail credentials and proxy settings', () => {
    const config = loadAppConfig({
      NODE_ENV: 'test',
      APP_URL: 'https://example.test///',
      PORT: '1234',
      BCRYPT_ROUNDS: 'invalid',
      DB_PORT: '5555',
      DB_SSL: 'YES',
      DB_SSL_REJECT_UNAUTHORIZED: 'false',
      DB_MIGRATIONS_RUN: 'off',
      ALLOW_REMOTE_DB: 'true',
      CORS_ORIGINS: ' https://one.test, https://two.test ',
      TRUST_PROXY: '2',
      MAIL_DRIVER: 'smtp',
      SMTP_USER: 'sender',
      SMTP_PASSWORD: 'secret',
      SMTP_HOST: 'smtp.test',
      SMTP_PORT: '2525',
      SMTP_SECURE: '1',
      MAIL_FROM: ' Test Sender ',
      STORAGE_DIR: ' ./tmp ',
      GEOCODER_BASE_URL: 'https://geo.test///',
      STOP_WORDS: 'word, other',
    });
    expect(config).toMatchObject({
      isTest: true,
      port: 1234,
      bcryptRounds: 12,
      appUrl: 'https://example.test',
      trustProxy: 2,
      corsOrigins: ['https://one.test', 'https://two.test'],
      db: {
        port: 5555,
        ssl: true,
        sslRejectUnauthorized: false,
        migrationsRun: false,
        allowRemote: true,
      },
      mail: {
        driver: 'smtp',
        user: 'sender',
        password: 'secret',
        port: 2525,
        secure: true,
        from: 'Test Sender',
      },
      storage: { dir: './tmp' },
      geocoder: { baseUrl: 'https://geo.test' },
      extraStopWords: ['word', 'other'],
    });
    expect(loadAppConfig({ TRUST_PROXY: 'true' }).trustProxy).toBe(true);
    expect(loadAppConfig({ TRUST_PROXY: '0' }).trustProxy).toBe(false);
    expect(loadAppConfig({ TRUST_PROXY: 'loopback' }).trustProxy).toBe(
      'loopback',
    );
    expect(
      loadAppConfig({ DB_SSL: ' ', CORS_ORIGINS: ' , ', TRUST_PROXY: ' ' }).db
        .ssl,
    ).toBe(false);
  });
  it('rejects weak production secrets and invalid mail strategies', () => {
    expect(() => loadAppConfig({ NODE_ENV: 'production' })).toThrow(
      'FILE_URL_SECRET',
    );
    expect(() =>
      loadAppConfig({ NODE_ENV: 'production', FILE_URL_SECRET: 'short' }),
    ).toThrow('FILE_URL_SECRET');
    expect(
      loadAppConfig({
        NODE_ENV: 'production',
        FILE_URL_SECRET: 'a-secure-test-secret',
      }).isProduction,
    ).toBe(true);
    expect(() => loadAppConfig({ MAIL_DRIVER: 'unknown' })).toThrow(
      'MAIL_DRIVER',
    );
  });
  it('guards remote databases and always uses migrations instead of synchronization', () => {
    for (const host of [
      'localhost',
      '127.0.0.1',
      '::1',
      '[::1]',
      'postgres',
      'db',
      ' LOCALHOST ',
    ])
      expect(isLocalHost(host)).toBe(true);
    expect(isLocalHost('production.test')).toBe(false);
    expect(() =>
      assertSafeDatabase(loadAppConfig({ DB_HOST: 'production.test' })),
    ).toThrow('Refusing');
    expect(() =>
      assertSafeDatabase(
        loadAppConfig({ DB_HOST: 'production.test', ALLOW_REMOTE_DB: 'true' }),
      ),
    ).not.toThrow();
    const options = buildDataSourceOptions(
      loadAppConfig({ DB_SSL: 'true', DB_SSL_REJECT_UNAUTHORIZED: 'false' }),
    );
    expect(options).toMatchObject({
      type: 'postgres',
      synchronize: false,
      installExtensions: false,
      migrationsRun: true,
      ssl: { rejectUnauthorized: false },
    });
    expect(buildDataSourceOptions(loadAppConfig({}))).toHaveProperty(
      'ssl',
      false,
    );
  });
});
