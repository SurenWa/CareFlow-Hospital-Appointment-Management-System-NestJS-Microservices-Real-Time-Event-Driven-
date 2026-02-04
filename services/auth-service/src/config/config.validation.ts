import { plainToInstance } from 'class-transformer';
import {
    IsEnum,
    IsNumber,
    IsString,
    IsOptional,
    validateSync,
    Min,
    Max,
} from 'class-validator';

export enum Environment {
    Development = 'development',
    Production = 'production',
    Test = 'test',
}

export class EnvironmentVariables {
    @IsEnum(Environment)
    NODE_ENV: Environment;

    @IsNumber()
    @Min(1)
    @Max(65535)
    PORT: number;

    @IsString()
    MONGODB_URI: string;

    @IsString()
    JWT_SECRET: string;

    @IsString()
    JWT_ACCESS_EXPIRES_IN: string;

    @IsString()
    JWT_REFRESH_EXPIRES_IN: string;

    @IsNumber()
    @Min(4)
    @Max(16)
    BCRYPT_ROUNDS: number;

    @IsString()
    RABBITMQ_URL: string;

    @IsNumber()
    LOGIN_RATE_LIMIT_TTL: number;

    @IsNumber()
    LOGIN_RATE_LIMIT_MAX: number;

    @IsString()
    SMTP_HOST: string;

    @IsNumber()
    SMTP_PORT: number;

    @IsOptional()
    @IsString()
    SMTP_USER?: string;

    @IsOptional()
    @IsString()
    SMTP_PASS?: string;

    @IsString()
    SMTP_FROM: string;
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
                const constraints = err.constraints
                    ? Object.values(err.constraints).join(', ')
                    : 'Unknown error';
                return `${err.property}: ${constraints}`;
            })
            .join('\n');

        throw new Error(`Auth Service config validation failed:\n${errorMessages}`);
    }

    return validatedConfig;
}