import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { HealthCheckResponse, HealthCheck } from '@careflow/shared';

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(
        private prisma: PrismaService,
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
        const dbReady = await this.prisma.healthCheck();

        if (!dbReady) {
            return { status: 'not ready - PostgreSQL unavailable' };
        }

        return { status: 'ready' };
    }

    @Get()
    @ApiOperation({ summary: 'Full health check' })
    @ApiResponse({ status: 200 })
    async healthCheck(): Promise<HealthCheckResponse> {
        const checks: HealthCheck[] = [];
        let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

        // PostgreSQL
        const dbReady = await this.prisma.healthCheck();
        checks.push({
            name: 'postgresql',
            status: dbReady ? 'pass' : 'fail',
            message: dbReady ? 'Connected' : 'Disconnected',
        });
        if (!dbReady) overallStatus = 'unhealthy';

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
            service: 'patient-service',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            checks,
        };
    }
}