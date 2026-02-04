import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfigService } from './config';

async function bootstrap() {
    const logger = new Logger('Bootstrap');

    const app = await NestFactory.create(AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    const config = app.get(AppConfigService);

    // Validation
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

    // CORS
    app.enableCors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    });

    // Swagger
    if (!config.isProduction) {
        const swaggerConfig = new DocumentBuilder()
            .setTitle('CareFlow Patient Service')
            .setDescription('Patient and medical records management')
            .setVersion('1.0.0')
            .addTag('Patients')
            .addTag('Medical Records')
            .addTag('Health')
            .build();

        const document = SwaggerModule.createDocument(app, swaggerConfig);
        SwaggerModule.setup('docs', app, document);

        logger.log(`Swagger: http://localhost:${config.port}/docs`);
    }

    // Shutdown hooks
    app.enableShutdownHooks();

    // Start
    await app.listen(config.port);

    logger.log(`🏥 Patient Service running on http://localhost:${config.port}`);
}

bootstrap().catch((err) => {
    console.error('Failed to start Patient Service:', err);
    process.exit(1);
});