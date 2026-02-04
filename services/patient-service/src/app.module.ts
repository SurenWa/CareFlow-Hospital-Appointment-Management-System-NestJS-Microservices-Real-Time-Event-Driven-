import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { AppConfigModule } from './config';
import { PrismaModule } from './prisma';
import { RabbitMQModule } from './rabbitmq';
import { PatientModule } from './patient/patient.module';
import { MedicalRecordModule } from './medical-record/medical-record.module';
import { HealthModule } from './health/health.module';
import { HttpExceptionFilter } from './common/filters';

@Module({
    imports: [
        // Configuration
        AppConfigModule,

        // Database
        PrismaModule,

        // Message Queue
        RabbitMQModule,

        // Feature modules
        PatientModule,
        MedicalRecordModule,
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