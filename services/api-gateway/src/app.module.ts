import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

// Core modules
import { AppConfigModule, AppConfigService } from './config';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { ProxyModule } from './proxy/proxy.module';
import { WebSocketModule } from './websocket/websocket.module';
import { HealthModule } from './health/health.module';

// Guards
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

// Interceptors
import {
    CorrelationInterceptor,
    LoggingInterceptor,
    TransformInterceptor,
    TimeoutInterceptor,
} from './common/interceptors';

// Filters
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RootModule } from './root/root.module';

/**
 * Root Application Module
 *
 * This is where all pieces come together.
 *
 * Module loading order matters for guards:
 * 1. JwtAuthGuard - Validates JWT, extracts user
 * 2. RolesGuard - Checks RBAC permissions
 * 3. ThrottlerGuard - Rate limiting
 *
 * Interceptor execution order (onion model):
 * Request:  Correlation → Logging → Timeout → Transform → Handler
 * Response: Transform → Timeout → Logging → Correlation → Client
 */
@Module({
    imports: [
        // Configuration (loaded first, globally available)
        AppConfigModule,

        // Redis (globally available)
        RedisModule,

        // Rate limiting
        ThrottlerModule.forRootAsync({
            inject: [AppConfigService],
            useFactory: (config: AppConfigService) => ({
                throttlers: [
                    {
                        name: 'default',
                        ttl: config.rateLimit.ttl * 1000, // Convert to ms
                        limit: config.rateLimit.max,
                    },
                ],
            }),
        }),

        // Auth (JWT validation)
        AuthModule,

        // Request proxying to microservices
        ProxyModule,

        // WebSocket gateway
        WebSocketModule,

        // Health checks
        HealthModule,

        // Root API info
        RootModule,
    ],
    providers: [
        // Global exception filter
        {
            provide: APP_FILTER,
            useClass: HttpExceptionFilter,
        },

        // Global interceptors (order matters!)
        {
            provide: APP_INTERCEPTOR,
            useClass: CorrelationInterceptor, // First: Add correlation ID
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: LoggingInterceptor, // Second: Log request/response
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: TimeoutInterceptor, // Third: Enforce timeout
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: TransformInterceptor, // Fourth: Transform response
        },

        // Global guards (order matters!)
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard, // First: Authenticate
        },
        {
            provide: APP_GUARD,
            useClass: RolesGuard, // Second: Authorize
        },
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard, // Third: Rate limit
        },
    ],
})
export class AppModule {}
