import { plainToInstance } from 'class-transformer';
import {
    IsEnum,
    IsNumber,
    IsString,
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
    DATABASE_URL: string;

    @IsString()
    RABBITMQ_URL: string;

    @IsNumber()
    MAX_FILE_SIZE: number;

    @IsString()
    UPLOAD_DIR: string;
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

        throw new Error(`Patient Service config validation failed:\n${errorMessages}`);
    }

    return validatedConfig;
}