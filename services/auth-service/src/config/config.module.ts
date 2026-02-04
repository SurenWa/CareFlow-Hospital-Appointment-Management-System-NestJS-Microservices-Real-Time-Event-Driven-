import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AppConfigService } from './config.service';
import { validate } from './config.validation';

@Global()
@Module({
    imports: [
        NestConfigModule.forRoot({
            envFilePath: [
                `.env.${process.env.NODE_ENV || 'local'}`,
                '.env.local',
                '.env',
            ],
            validate,
            isGlobal: true,
            cache: true,
        }),
    ],
    providers: [AppConfigService],
    exports: [AppConfigService],
})
export class AppConfigModule { }