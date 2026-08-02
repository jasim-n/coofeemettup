// Entry: dist/src/main.js (see nest-cli.json entryFile).
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { Express } from 'express';
import { AppModule } from './app.module';
import type { Env } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);

  // Behind a hosting proxy (Render) → trust X-Forwarded-* for HTTPS detection.
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  expressApp.set('trust proxy', 1);

  // Web and API are on different origins in prod → let cross-origin resources
  // (e.g. the admin CNIC <img>) load; fetch/XHR is still governed by CORS below.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser(config.get('SESSION_SECRET', { infer: true })));
  // WEB_ORIGIN may be a comma-separated list (prod + preview URLs).
  const origins = config
    .get('WEB_ORIGIN', { infer: true })
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length <= 1 ? (origins[0] ?? true) : origins,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');

  // Hosts inject PORT; bind 0.0.0.0 so the platform can route to us.
  const port = config.get('PORT', { infer: true }) ?? 4000;
  await app.listen(port, '0.0.0.0');
  Logger.log(`API listening on :${port}/api`, 'Bootstrap');
}

void bootstrap();
