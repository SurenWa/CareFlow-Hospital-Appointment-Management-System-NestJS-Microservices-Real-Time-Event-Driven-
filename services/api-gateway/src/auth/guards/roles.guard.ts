import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, PERMISSIONS_KEY, PUBLIC_KEY } from '../../common/decorators';
import { UserContext, UserRole, Permission } from '@careflow/shared';

/**
 * Authorization Guard - RBAC + ABAC
 *
 * Checks if the authenticated user has the required roles/permissions
 * to access the requested resource.
 *
 * This runs AFTER JwtAuthGuard (authentication)
 */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        // Skip for public routes
        const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        // Get required roles and permissions from decorators
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );

        // If no roles/permissions specified, allow access (just auth required)
        if (!requiredRoles?.length && !requiredPermissions?.length) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user: UserContext = request.user;

        if (!user) {
            throw new ForbiddenException('User context not found');
        }

        // Check roles (OR logic - user needs at least one of the required roles)
        if (requiredRoles?.length) {
            const hasRole = requiredRoles.some((role) => user.roles.includes(role));
            if (!hasRole) {
                throw new ForbiddenException(
                    `Insufficient role. Required: ${requiredRoles.join(' or ')}`,
                );
            }
        }

        // Check permissions (AND logic - user needs all required permissions)
        if (requiredPermissions?.length) {
            const hasAllPermissions = requiredPermissions.every((permission) =>
                user.permissions.includes(permission),
            );
            if (!hasAllPermissions) {
                throw new ForbiddenException(
                    `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
                );
            }
        }

        return true;
    }
}
