import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators';
import { RedisService } from '../redis/redis.service';
import { ProxyService, ServiceTarget } from '../proxy/proxy.service';
import { HealthCheckResponse, HealthCheck } from '@careflow/shared';

/**
 * Health Check Controller
 *
 * Provides endpoints for Kubernetes probes and monitoring.
 *
 * - /health/live: Liveness probe - is the process running?
 * - /health/ready: Readiness probe - is it ready to serve traffic?
 * - /health: Full health check with all dependencies
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(
        private redis: RedisService,
        private proxyService: ProxyService,
    ) {}

    /**
     * Liveness probe
     * Returns 200 if the process is alive
     * Kubernetes uses this to know when to restart a container
     */
    @Public()
    @Get('live')
    @ApiOperation({ summary: 'Liveness probe' })
    @ApiResponse({ status: 200, description: 'Service is alive' })
    async liveness(): Promise<{ status: string }> {
        return { status: 'alive' };
    }

    /**
     * Readiness probe
     * Returns 200 if ready to accept traffic
     * Kubernetes uses this to know when to route traffic
     */
    @Public()
    @Get('ready')
    @ApiOperation({ summary: 'Readiness probe' })
    @ApiResponse({ status: 200, description: 'Service is ready' })
    @ApiResponse({ status: 503, description: 'Service not ready' })
    async readiness(): Promise<{ status: string }> {
        // Check critical dependencies
        const redisHealthy = await this.redis.ping();

        if (!redisHealthy) {
            return { status: 'not ready - Redis unavailable' };
        }

        return { status: 'ready' };
    }

    /**
     * Full health check
     * Returns detailed health status of all dependencies
     */
    @Public()
    @Get()
    @ApiOperation({ summary: 'Full health check with dependency status' })
    @ApiResponse({ status: 200, description: 'Health check results' })
    async healthCheck(): Promise<HealthCheckResponse> {
        const checks: HealthCheck[] = [];
        let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

        // Check Redis
        const redisStart = Date.now();
        const redisHealthy = await this.redis.ping();
        checks.push({
            name: 'redis',
            status: redisHealthy ? 'pass' : 'fail',
            message: redisHealthy ? 'Connected' : 'Connection failed',
            duration: Date.now() - redisStart,
        });
        if (!redisHealthy) overallStatus = 'unhealthy';

        // Check Auth Service
        const authStart = Date.now();
        const authHealthy = await this.proxyService.checkServiceHealth(ServiceTarget.AUTH);
        checks.push({
            name: 'auth-service',
            status: authHealthy ? 'pass' : 'warn',
            message: authHealthy ? 'Available' : 'Unavailable',
            duration: Date.now() - authStart,
        });
        if (!authHealthy && overallStatus === 'healthy') overallStatus = 'degraded';

        // Check Patient Service
        const patientStart = Date.now();
        const patientHealthy = await this.proxyService.checkServiceHealth(ServiceTarget.PATIENT);
        checks.push({
            name: 'patient-service',
            status: patientHealthy ? 'pass' : 'warn',
            message: patientHealthy ? 'Available' : 'Unavailable',
            duration: Date.now() - patientStart,
        });
        if (!patientHealthy && overallStatus === 'healthy') overallStatus = 'degraded';

        // Check Appointment Service
        const appointmentStart = Date.now();
        const appointmentHealthy = await this.proxyService.checkServiceHealth(
            ServiceTarget.APPOINTMENT,
        );
        checks.push({
            name: 'appointment-service',
            status: appointmentHealthy ? 'pass' : 'warn',
            message: appointmentHealthy ? 'Available' : 'Unavailable',
            duration: Date.now() - appointmentStart,
        });
        if (!appointmentHealthy && overallStatus === 'healthy') overallStatus = 'degraded';

        // Check Billing Service
        const billingStart = Date.now();
        const billingHealthy = await this.proxyService.checkServiceHealth(ServiceTarget.BILLING);
        checks.push({
            name: 'billing-service',
            status: billingHealthy ? 'pass' : 'warn',
            message: billingHealthy ? 'Available' : 'Unavailable',
            duration: Date.now() - billingStart,
        });
        if (!billingHealthy && overallStatus === 'healthy') overallStatus = 'degraded';

        return {
            status: overallStatus,
            service: 'api-gateway',
            version: process.env.npm_package_version || '1.0.0',
            timestamp: new Date().toISOString(),
            checks,
        };
    }
}
