import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { createOriginCheck } from './common/origin-check.middleware';
import { buildValidationPipe } from './common/validation';
import { AppConfig } from './config/app.config';

/** Shared by the real server and the e2e tests, so that tests exercise the same pipeline. */
export function configureApp(
  app: NestExpressApplication,
  config: AppConfig,
): void {
  app.set('trust proxy', config.trustProxy);

  // The API only returns JSON and images; CSP is the job of the web client host (and would break Swagger UI).
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());
  app.use(createOriginCheck(config.corsOrigins));

  app.setGlobalPrefix('api');
  app.useGlobalPipes(buildValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  });
  app.enableShutdownHooks();
}
