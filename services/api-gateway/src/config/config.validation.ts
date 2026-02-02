import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync, Min, Max } from 'class-validator';

export enum Environment {
    Development = 'development',
    Production = 'production',
    Test = 'test',
}

/**
 * Environment variables validation schema
 * This ensures all required config is present at startup
 * Fail fast > runtime errors
 */
export class EnvironmentVariables {
    @IsEnum(Environment)
    NODE_ENV: Environment;

    @IsNumber()
    @Min(1)
    @Max(65535)
    PORT: number;

    @IsString()
    API_PREFIX: string;

    @IsString()
    JWT_SECRET: string;

    @IsString()
    JWT_EXPIRES_IN: string;

    @IsString()
    JWT_REFRESH_EXPIRES_IN: string;

    @IsString()
    REDIS_HOST: string;

    @IsNumber()
    REDIS_PORT: number;

    @IsOptional()
    @IsString()
    REDIS_PASSWORD?: string;

    @IsNumber()
    REDIS_DB: number;

    @IsString()
    AUTH_SERVICE_URL: string;

    @IsString()
    PATIENT_SERVICE_URL: string;

    @IsString()
    APPOINTMENT_SERVICE_URL: string;

    @IsString()
    BILLING_SERVICE_URL: string;

    @IsNumber()
    RATE_LIMIT_TTL: number;

    @IsNumber()
    RATE_LIMIT_MAX: number;

    @IsString()
    CORS_ORIGINS: string;

    @IsString()
    LOG_LEVEL: string;

    @IsString()
    WS_PATH: string;
}

export function validate(config: Record<string, unknown>) {
    const validatedConfig = plainToInstance(EnvironmentVariables, config, {
        enableImplicitConversion: true,
    });

    const errors = validateSync(validatedConfig, {
        skipMissingProperties: false,
    });

    if (errors.length > 0) {
        const errorMessages = errors
            .map((err) => {
                const constraints = err.constraints ? Object.values(err.constraints).join(', ') : 'Unknown error';
                return `${err.property}: ${constraints}`;
            })
            .join('\n');

        throw new Error(`Environment validation failed:\n${errorMessages}`);
    }

    return validatedConfig;
}