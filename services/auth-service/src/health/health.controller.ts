import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RabbitMQService } from '../rabbitmq';
import { HealthCheckResponse, HealthCheck } from '@careflow/shared';

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(
        @InjectConnection() private mongoConnection: Connection,
        private rabbitMQ: RabbitMQService,
    ) { }

    @Get('live')
    @ApiOperation({ summary: 'Liveness probe' })
    @ApiResponse({ status: 200 })
    async liveness(): Promise<{ status: string }> {
        return { status: 'alive' };
    }

    @Get('ready')
    @ApiOperation({ summary: 'Readiness probe' })
    @ApiResponse({ status: 200 })
    async readiness(): Promise<{ status: string }> {
        const mongoReady = this.mongoConnection.readyState === 1;

        if (!mongoReady) {
            return { status: 'not ready - MongoDB unavailable' };
        }

        return { status: 'ready' };
    }

    @Get()
    @ApiOperation({ summary: 'Full health check' })
    @ApiResponse({ status: 200 })
    async healthCheck(): Promise<HealthCheckResponse> {
        const checks: HealthCheck[] = [];
        let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

        // MongoDB
        const mongoReady = this.mongoConnection.readyState === 1;
        checks.push({
            name: 'mongodb',
            status: mongoReady ? 'pass' : 'fail',
            message: mongoReady ? 'Connected' : 'Disconnected',
        });
        if (!mongoReady) overallStatus = 'unhealthy';

        // RabbitMQ
        const rabbitReady = this.rabbitMQ.isConnected();
        checks.push({
            name: 'rabbitmq',
            status: rabbitReady ? 'pass' : 'warn',
            message: rabbitReady ? 'Connected' : 'Disconnected',
        });
        if (!rabbitReady && overallStatus === 'healthy') {
            overallStatus = 'degraded';
        }

        return {
            status: overallStatus,
            service: 'auth-service',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            checks,
        };
    }
}