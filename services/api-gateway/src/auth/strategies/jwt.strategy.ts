import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../../config';
import { RedisService } from '../../redis/redis.service';
import { JwtPayload, UserContext } from '@careflow/shared';

/**
 * JWT Strategy for Passport
 *
 * This validates incoming JWTs and extracts user context.
 * The actual token issuance happens in Auth Service.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private config: AppConfigService,
        private redis: RedisService,
    ) {
        super({
            // Extract JWT from Authorization header: "Bearer <token>"
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

            // Don't ignore expiration - let it fail if expired
            ignoreExpiration: false,

            // Secret for HS256 verification
            // In production, use RS256 with public key from Auth Service
            secretOrKey: config.jwt.secret,

            // Pass the request to validate() for additional checks
            passReqToCallback: true,
        });
    }

    /**
     * Called after JWT signature is verified
     * This is where we do additional validation
     */
    async validate(request: Request, payload: JwtPayload): Promise<UserContext> {
        // Check if token is blacklisted (user logged out)
        if (payload.sub) {
            // Use token's unique ID (jti) if available, otherwise use sub + iat
            const tokenIdentifier = `${payload.sub}:${payload.iat}`;
            const isBlacklisted = await this.redis.isTokenBlacklisted(tokenIdentifier);

            if (isBlacklisted) {
                throw new UnauthorizedException('Token has been revoked');
            }
        }

        // Optional: Check cached session for additional validation
        // This allows us to invalidate all sessions if needed
        const cachedSession = await this.redis.getUserSession(payload.sub);

        // If we have a cached session, we could check for forced re-auth
        // For now, we just continue if no cache exists

        // Transform JWT payload to UserContext
        // This is what gets attached to request.user
        const userContext: UserContext = {
            userId: payload.sub,
            email: payload.email,
            roles: payload.roles,
            permissions: payload.permissions,
            departmentId: payload.departmentId,
        };

        return userContext;
    }
}
