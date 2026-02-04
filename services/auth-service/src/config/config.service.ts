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

    get mongodbUri(): string {
        return this.configService.get<string>('MONGODB_URI')!;
    }

    get jwt() {
        return {
            secret: this.configService.get<string>('JWT_SECRET')!,
            accessExpiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN')!,
            refreshExpiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')!,
        };
    }

    get bcryptRounds(): number {
        return this.configService.get<number>('BCRYPT_ROUNDS')!;
    }

    get rabbitmqUrl(): string {
        return this.configService.get<string>('RABBITMQ_URL')!;
    }

    get loginRateLimit() {
        return {
            ttl: this.configService.get<number>('LOGIN_RATE_LIMIT_TTL')!,
            max: this.configService.get<number>('LOGIN_RATE_LIMIT_MAX')!,
        };
    }

    get smtp() {
        return {
            host: this.configService.get<string>('SMTP_HOST')!,
            port: this.configService.get<number>('SMTP_PORT')!,
            user: this.configService.get<string>('SMTP_USER'),
            pass: this.configService.get<string>('SMTP_PASS'),
            from: this.configService.get<string>('SMTP_FROM')!,
        };
    }
}