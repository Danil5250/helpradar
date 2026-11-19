import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import appConfig, { AppConfig } from './config/app.config';
import { configureApp } from './app.setup';
import { configureSwagger } from './swagger.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<AppConfig>(appConfig.KEY);
  configureApp(app, config);
  configureSwagger(app, config.swagger);
  await app.listen(process.env.PORT ?? 3000);
  const docs = config.swagger ? ' (OpenAPI docs: /api/docs)' : '';
  Logger.log(
    `HelpRadar API is running on http://localhost:${config.port}/api${docs}`,
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
