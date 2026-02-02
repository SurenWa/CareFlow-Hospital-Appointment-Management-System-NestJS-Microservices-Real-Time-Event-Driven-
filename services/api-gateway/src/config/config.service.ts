import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { Environment } from './config.validation';

/**
 * Typed configuration service
 * Provides type-safe access to environment variables
 * No more config.get('SOME_KEY') with unknown types
 */
@Injectable()
export class AppConfigService {
    constructor(private configService: NestConfigService) {}

    get nodeEnv(): Environment {
        return this.configService.get<Environment>('NODE_ENV')!;
    }

    get isDevelopment(): boolean {
        return this.nodeEnv === Environment.Development;
    }

    get isProduction(): boolean {
        return this.nodeEnv === Environment.Production;
    }

    get port(): number {
        return this.configService.get<number>('PORT')!;
    }

    get apiPrefix(): string {
        return this.configService.get<string>('API_PREFIX')!;
    }

    // JWT Configuration
    get jwt() {
        return {
            secret: this.configService.get<string>('JWT_SECRET')!,
            expiresIn: this.configService.get<string>('JWT_EXPIRES_IN')!,
            refreshExpiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')!,
        };
    }

    // Redis Configuration
    get redis() {
        return {
            host: this.configService.get<string>('REDIS_HOST')!,
            port: this.configService.get<number>('REDIS_PORT')!,
            password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
            db: this.configService.get<number>('REDIS_DB')!,
        };
    }

    // Internal Service URLs
    get services() {
        return {
            auth: this.configService.get<string>('AUTH_SERVICE_URL')!,
            patient: this.configService.get<string>('PATIENT_SERVICE_URL')!,
            appointment: this.configService.get<string>('APPOINTMENT_SERVICE_URL')!,
            billing: this.configService.get<string>('BILLING_SERVICE_URL')!,
        };
    }

    // Rate Limiting
    get rateLimit() {
        return {
            ttl: this.configService.get<number>('RATE_LIMIT_TTL')!,
            max: this.configService.get<number>('RATE_LIMIT_MAX')!,
        };
    }

    // CORS Origins
    get corsOrigins(): string[] {
        const origins = this.configService.get<string>('CORS_ORIGINS')!;
        return origins.split(',').map((origin) => origin.trim());
    }

    get logLevel(): string {
        return this.configService.get<string>('LOG_LEVEL')!;
    }

    get wsPath(): string {
        return this.configService.get<string>('WS_PATH')!;
    }
}
