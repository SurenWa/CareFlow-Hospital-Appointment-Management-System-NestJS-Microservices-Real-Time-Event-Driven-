import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { PUBLIC_KEY } from '../../common/decorators';

/**
 * JWT Authentication Guard
 *
 * Applied globally to all routes.
 * Routes marked with @Public() bypass authentication.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        // Check if route is marked as public
        const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        // Proceed with JWT validation
        return super.canActivate(context);
    }

    handleRequest<T>(err: Error | null, user: T, info: Error | null): T {
        // Handle authentication errors with clear messages
        if (err || !user) {
            if (info?.name === 'TokenExpiredError') {
                throw new UnauthorizedException('Token has expired');
            }
            if (info?.name === 'JsonWebTokenError') {
                throw new UnauthorizedException('Invalid token');
            }
            if (info?.name === 'NotBeforeError') {
                throw new UnauthorizedException('Token not yet valid');
            }
            throw new UnauthorizedException(err?.message || 'Authentication required');
        }

        return user;
    }
}
