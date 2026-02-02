import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Global Redis module
 * Available throughout the application without explicit imports
 */
@Global()
@Module({
    providers: [RedisService],
    exports: [RedisService],
})
export class RedisModule {}
