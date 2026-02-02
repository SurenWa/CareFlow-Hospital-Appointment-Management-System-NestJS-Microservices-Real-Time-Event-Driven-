/**
 * User-related types shared across all services
 * These types define the contract for user identity throughout the system
 */

// Roles in the system - these map to RBAC
export enum UserRole {
    ADMIN = 'admin',
    DOCTOR = 'doctor',
    NURSE = 'nurse',
    PATIENT = 'patient',
}

// Permissions for fine-grained ABAC control
export enum Permission {
    // Patient permissions
    PATIENT_READ = 'patient:read',
    PATIENT_WRITE = 'patient:write',
    PATIENT_DELETE = 'patient:delete',
    PATIENT_READ_OWN = 'patient:read:own',
    PATIENT_WRITE_OWN = 'patient:write:own',

    // Appointment permissions
    APPOINTMENT_READ = 'appointment:read',
    APPOINTMENT_WRITE = 'appointment:write',
    APPOINTMENT_DELETE = 'appointment:delete',
    APPOINTMENT_READ_OWN = 'appointment:read:own',
    APPOINTMENT_WRITE_OWN = 'appointment:write:own',

    // Billing permissions
    BILLING_READ = 'billing:read',
    BILLING_WRITE = 'billing:write',
    BILLING_READ_OWN = 'billing:read:own',

    // Admin permissions
    USER_MANAGE = 'user:manage',
    SYSTEM_ADMIN = 'system:admin',
}

// JWT payload structure - what's encoded in the token
export interface JwtPayload {
    sub: string; // User ID
    email: string;
    roles: UserRole[];
    permissions: Permission[];
    departmentId?: string; // For ABAC - which department they belong to
    iat?: number; // Issued at
    exp?: number; // Expiration
}

// User context passed in internal request headers
// This is what Gateway extracts from JWT and forwards
export interface UserContext {
    userId: string;
    email: string;
    roles: UserRole[];
    permissions: Permission[];
    departmentId?: string;
}

// Request headers for internal service communication
export const INTERNAL_HEADERS = {
    USER_ID: 'x-user-id',
    USER_EMAIL: 'x-user-email',
    USER_ROLES: 'x-user-roles',
    USER_PERMISSIONS: 'x-user-permissions',
    DEPARTMENT_ID: 'x-department-id',
    CORRELATION_ID: 'x-correlation-id',
    REQUEST_ID: 'x-request-id',
} as const;