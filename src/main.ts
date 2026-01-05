import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman, webhooks)
      if (!origin || origin === 'null') {
        return callback(null, true);
      }

      // Allow localhost with any subdomain on ports 3000, 3001, 5000 (both http and https)
      const allowedPatterns = [
        /^https?:\/\/localhost:\d+$/,
        /^https?:\/\/127\.0\.0\.1:\d+$/,
        /^https?:\/\/.+\.localhost:\d+$/,
        /^https?:\/\/.+\.127\.0\.0\.1:\d+$/,
      ];

      const isAllowed = allowedPatterns.some((pattern) => pattern.test(origin));

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-tenant-domain',
      'domain',
    ],
  });

  // Set global prefix
  app.setGlobalPrefix('api');

  // Global validation pipe with transform
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Serve static files
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  const port = parseInt(process.env.PORT ?? '3000', 10);
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
}
bootstrap();

// Global process-level error visibility
process.on('unhandledRejection', (reason: any) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});
