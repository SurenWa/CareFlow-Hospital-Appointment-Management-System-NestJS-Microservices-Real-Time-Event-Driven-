import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AppConfigService } from './config.service';
import { validate } from './config.validation';

/**
 * Global configuration module
 * @Global() makes AppConfigService available everywhere without importing
 */
@Global()
@Module({
    imports: [
        NestConfigModule.forRoot({
            // Load environment-specific file
            envFilePath: [`.env.${process.env.NODE_ENV || 'local'}`, '.env.local', '.env'],
            validate,
            isGlobal: true,
            cache: true, // Cache env vars for performance
        }),
    ],
    providers: [AppConfigService],
    exports: [AppConfigService],
})
export class AppConfigModule {}
