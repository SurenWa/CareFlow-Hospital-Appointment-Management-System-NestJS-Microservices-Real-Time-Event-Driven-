import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CareFlowWebSocketGateway } from './websocket.gateway';
import { AppConfigService } from '../config';

/**
 * WebSocket Module
 *
 * Provides real-time communication capabilities.
 * Uses Socket.IO for WebSocket transport with polling fallback.
 */
@Module({
    imports: [
        JwtModule.registerAsync({
            inject: [AppConfigService],
            useFactory: (config: AppConfigService) => ({
                secret: config.jwt.secret,
                signOptions: { expiresIn: config.jwt.expiresIn },
            }),
        }),
    ],
    providers: [CareFlowWebSocketGateway],
    exports: [CareFlowWebSocketGateway],
})
export class WebSocketModule {}
