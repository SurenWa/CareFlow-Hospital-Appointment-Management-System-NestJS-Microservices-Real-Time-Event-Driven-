import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfigService } from './config';

/**
 * Bootstrap the API Gateway
 *
 * This is the entry point for the entire CareFlow system.
 * All external traffic flows through here.
 */
async function bootstrap() {
    const logger = new Logger('Bootstrap');

    // Create NestJS application
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        // Enable raw body for Stripe webhooks
        rawBody: true,
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Get config service
    const config = app.get(AppConfigService);

    // ==================== Security ====================

    // Helmet for security headers
    app.use(
        helmet({
            contentSecurityPolicy: config.isProduction ? undefined : false,
            crossOriginEmbedderPolicy: false,
        }),
    );

    // CORS configuration
    app.enableCors({
        origin: config.corsOrigins,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-Request-ID'],
        exposedHeaders: ['X-Correlation-ID', 'X-Request-ID'],
        credentials: true,
        maxAge: 3600,
    });

    // ==================== Validation ====================

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // Strip unknown properties
            forbidNonWhitelisted: true, // Throw on unknown properties
            transform: true, // Auto-transform payloads to DTO instances
            transformOptions: {
                enableImplicitConversion: true, // Convert query params to proper types
            },
            disableErrorMessages: config.isProduction, // Hide detailed errors in prod
        }),
    );

    // ==================== API Prefix ====================

    // Global API prefix (e.g., /api/v1)
    app.setGlobalPrefix(config.apiPrefix, {
        exclude: ['health', 'health/live', 'health/ready'], // Health checks at root
    });

    // ==================== Swagger ====================

    if (!config.isProduction) {
        const swaggerConfig = new DocumentBuilder()
            .setTitle('CareFlow API')
            .setDescription(                                `
                # CareFlow - Hospital & Appointment Management System

                ## Overview
                CareFlow is a comprehensive healthcare management platform providing:
                - Patient management
                - Appointment scheduling
                - Billing and payments
                - Real-time notifications

                ## Authentication
                All endpoints except health checks require JWT authentication.
                Include the token in the Authorization header: \`Bearer <token>\`

                ## Rate Limiting
                - Default: ${config.rateLimit.max} requests per ${config.rateLimit.ttl} seconds
                - Exceeding limits returns 429 Too Many Requests

                ## WebSocket
                Connect to \`ws://localhost:${config.port}/ws\` with JWT token for real-time updates.
                    `,
            )
            .setVersion('1.0.0')
            .addBearerAuth(
                {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    name: 'Authorization',
                    description: 'Enter JWT token',
                    in: 'header',
                },
                'Bearer',
            )
            .addTag('Authentication', 'User authentication and authorization')
            .addTag('Patients', 'Patient management')
            .addTag('Appointments', 'Appointment scheduling')
            .addTag('Billing', 'Payments and invoicing')
            .addTag('Health', 'Service health checks')
            .build();

        const document = SwaggerModule.createDocument(app, swaggerConfig);
        SwaggerModule.setup('docs', app, document, {
            swaggerOptions: {
                persistAuthorization: true, // Keep auth between page refreshes
                tagsSorter: 'alpha',
                operationsSorter: 'alpha',
            },
        });

        logger.log(`Swagger docs available at http://localhost:${config.port}/docs`);
    }

    // ==================== Trust Proxy ====================

    // Required when behind reverse proxy (NGINX)
    app.set('trust proxy', 1);

    // ==================== Graceful Shutdown ====================

    app.enableShutdownHooks();

    // ==================== Start Server ====================

    const port = config.port;
    await app.listen(port);

    logger.log(`🚀 API Gateway running on http://localhost:${port}`);
    logger.log(`📋 API prefix: /${config.apiPrefix}`);
    logger.log(`🔧 Environment: ${config.nodeEnv}`);
}

bootstrap().catch((err) => {
    console.error('Failed to start API Gateway:', err);
    process.exit(1);
});
