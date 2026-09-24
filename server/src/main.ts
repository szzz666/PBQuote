import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { exposeUploads } from './merchant-logo';
import { loadEnvFile } from './env';

async function bootstrap() {
  await loadEnvFile();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: true });
  exposeUploads(app);
  // Allow configuration payloads containing pricing and contact details.
  app.getHttpAdapter().getInstance().use(require('express').json({ limit: '1mb' }));
  app.enableCors();
  app.setGlobalPrefix('api/v1');
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
