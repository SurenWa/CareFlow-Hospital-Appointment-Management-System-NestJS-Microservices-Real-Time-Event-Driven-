import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ProxyModule } from '../proxy/proxy.module';

@Module({
    imports: [ProxyModule],
    controllers: [HealthController],
})
export class HealthModule {}
