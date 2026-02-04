import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';

import { AppConfigModule, AppConfigService } from './config';
import { RabbitMQModule } from './rabbitmq';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { HttpExceptionFilter } from './common/filters';

@Module({
    imports: [
        // Configuration
        AppConfigModule,

        // MongoDB
        MongooseModule.forRootAsync({
            inject: [AppConfigService],
            useFactory: (config: AppConfigService) => ({
                uri: config.mongodbUri,
                retryWrites: true,
                w: 'majority',
                maxPoolSize: 10,
                minPoolSize: 2,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            }),
        }),

        // RabbitMQ
        RabbitMQModule,

        // Feature modules
        UserModule,
        AuthModule,
        HealthModule,
    ],
    providers: [
        {
            provide: APP_FILTER,
            useClass: HttpExceptionFilter,
        },
    ],
})
export class AppModule { }