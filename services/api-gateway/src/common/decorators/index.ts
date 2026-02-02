import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { UserContext, UserRole, Permission } from '@careflow/shared';

/**
 * Extract the current user from the request
 * Usage: @CurrentUser() user: UserContext
 */
export const CurrentUser = createParamDecorator(
    (data: keyof UserContext | undefined, ctx: ExecutionContext): UserContext | unknown => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user as UserContext;

        // If a specific property is requested, return just that
        return data ? user?.[data] : user;
    },
);

/**
 * Extract correlation ID from request headers
 * Usage: @CorrelationId() correlationId: string
 */
export const CorrelationId = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): string => {
        const request = ctx.switchToHttp().getRequest();
        return request.headers['x-correlation-id'] || request.correlationId;
    },
);

// ==================== Authorization Decorators ====================

export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';
export const PUBLIC_KEY = 'isPublic';

/**
 * Mark an endpoint as requiring specific roles
 * Usage: @Roles(UserRole.ADMIN, UserRole.DOCTOR)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Mark an endpoint as requiring specific permissions
 * Usage: @Permissions(Permission.PATIENT_READ, Permission.APPOINTMENT_WRITE)
 */
export const Permissions = (...permissions: Permission[]) =>
    SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Mark an endpoint as public (no auth required)
 * Usage: @Public()
 */
export const Public = () => SetMetadata(PUBLIC_KEY, true);
