import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { Environment } from './config.validation';

@Injectable()
export class AppConfigService {
    constructor(private configService: NestConfigService) { }

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

    get databaseUrl(): string {
        return this.configService.get<string>('DATABASE_URL')!;
    }

    get rabbitmqUrl(): string {
        return this.configService.get<string>('RABBITMQ_URL')!;
    }

    get maxFileSize(): number {
        return this.configService.get<number>('MAX_FILE_SIZE')!;
    }

    get uploadDir(): string {
        return this.configService.get<string>('UPLOAD_DIR')!;
    }
}