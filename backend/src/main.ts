import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Allow all localhost origins (development)
      if (origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }

      // Allow configured frontend URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      if (origin === frontendUrl) {
        return callback(null, true);
      }

      // Allow production server IP
      if (origin === 'http://45.131.42.199' || origin === 'http://45.131.42.199:80') {
        return callback(null, true);
      }

      // Allow production domain
      if (origin === 'https://lencondb.ru' || origin === 'https://www.lencondb.ru') {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global prefix for API
  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
