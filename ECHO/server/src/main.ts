import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/global-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';

async function bootstrap() {
  // Patch BigInt serialization to prevent JSON.stringify errors when returning Prisma results containing BigInts
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Security headers
  app.use(helmet());

  // WebSocket adapter for Socket.io
  app.useWebSocketAdapter(new IoAdapter(app));

  // CORS — configurable via env
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://echo-web-tg.vercel.app',
      ];
  
  app.enableCors({ 
    origin: corsOrigins, 
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Healthcheck route for Railway at the root (outside /api prefix)
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/', (req, res) => {
    res.status(200).send('Echo Emotional Support Server is Running');
  });

  // Global exception filter — consistent JSON errors
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global validation pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix for all other routes, excluding healthcheck root
  app.setGlobalPrefix('api', { exclude: ['/'] });

  // Swagger API Documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Echo API')
      .setDescription('Anonymous mental health chat platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Echo server running on http://0.0.0.0:${port}`);
  logger.log(`🔌 WebSocket gateway active (Path: /socket.io)`);
  logger.log(`🔒 AES-256 encryption enabled`);
  logger.log(`🌐 CORS origins: ${corsOrigins.join(', ')}`);
  
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`📚 Swagger docs: http://0.0.0.0:${port}/api/docs`);
  }
}
bootstrap();
