import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { ENV, type Environment } from './config';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const env = app.get<Environment>(ENV);
  if (env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder().setTitle('Point Media API').setVersion('0.1.0').addCookieAuth('pm_session').build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }
  await app.listen(env.PORT, '127.0.0.1');
}
void bootstrap().catch(() => { console.error('API startup failed. Check environment and SQLite file permissions.'); process.exitCode = 1; });
