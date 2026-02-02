import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AppConfigService } from '../config';

/**
 * Auth Module
 *
 * Handles JWT validation at the Gateway level.
 *
 * NOTE: This module does NOT issue tokens.
 * Token issuance happens in Auth Service.
 * Gateway only validates and extracts user context.
 */
@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            inject: [AppConfigService],
            useFactory: (config: AppConfigService) => ({
                secret: config.jwt.secret,
                signOptions: { expiresIn: config.jwt.expiresIn },
            }),
        }),
    ],
    providers: [JwtStrategy, JwtAuthGuard, RolesGuard],
    exports: [JwtStrategy, JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
