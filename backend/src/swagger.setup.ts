import { timingSafeEqual } from 'crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { RequestHandler } from 'express';
import { hashToken } from './common/utils/tokens';
import type { AppConfig } from './config/app.config';
import { SESSION_COOKIE } from './modules/auth/auth.constants';

const docsPath = '/api/docs';
const jsonDocumentUrl = `${docsPath}-json`;
const yamlDocumentUrl = `${docsPath}-yaml`;

export function configureSwagger(
  app: NestExpressApplication,
  credentials: AppConfig['swagger'],
): void {
  if (!credentials) return;

  const encodedCredentials = Buffer.from(
    `${credentials.username}:${credentials.password}`,
    'utf8',
  ).toString('base64');
  const expected = Buffer.from(hashToken(encodedCredentials), 'hex');
  const requireDocsAuth: RequestHandler = (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const match = /^Basic +(\S+)$/i.exec(req.headers.authorization ?? '');
    if (
      match &&
      timingSafeEqual(expected, Buffer.from(hashToken(match[1]), 'hex'))
    ) {
      next();
      return;
    }

    res.set(
      'WWW-Authenticate',
      'Basic realm="HelpRadar API Docs", charset="UTF-8"',
    );
    res.status(401).send('Authentication required.');
  };

  app.use([docsPath, jsonDocumentUrl, yamlDocumentUrl], requireDocsAuth);

  // SRS 3.5.5: the REST API is described in the OpenAPI 3 format.
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('HelpRadar API')
      .setDescription(
        'Registration, login/logout and help announcements (SRS v1.1)',
      )
      .setVersion('1.1')
      .addCookieAuth(SESSION_COOKIE)
      .build(),
  );
  SwaggerModule.setup(docsPath, app, document, {
    jsonDocumentUrl,
    yamlDocumentUrl,
  });
}
