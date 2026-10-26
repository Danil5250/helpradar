import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import appConfig, { AppConfig } from './config/app.config';
import { SESSION_COOKIE } from './modules/auth/auth.constants';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<AppConfig>(appConfig.KEY);
  configureApp(app, config);
  // SRS 3.5.5: the REST API is described in the OpenAPI 3 format
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
  SwaggerModule.setup('api/docs', app, document);
  await app.listen(process.env.PORT ?? 3000);
  Logger.log(
    `HelpRadar API is running on http://localhost:${config.port}/api (OpenAPI docs: /api/docs)`,
    'Bootstrap',
  );
}

bootstrap().catch((error) => {
  Logger.error(
    error instanceof Error ? error.message : String(error),
    undefined,
    'Bootstrap',
  );
  process.exit(1);
});
