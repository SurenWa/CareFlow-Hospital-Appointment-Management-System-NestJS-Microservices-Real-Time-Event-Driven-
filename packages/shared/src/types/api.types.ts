/**
 * API-related types shared across services
 * Standardizes request/response formats
 */

// Standard API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string; // Only in development
}

export interface ResponseMeta {
  timestamp: string;
  requestId: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Pagination request params
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Standard error codes
export enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',

  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
  UPSTREAM_ERROR = 'UPSTREAM_ERROR',
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  service: string;
  version: string;
  timestamp: string;
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  duration?: number; // ms
}

// Service endpoints for Gateway routing
export const SERVICE_ENDPOINTS = {
  AUTH: {
    BASE: '/auth',
    INTERNAL_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  },
  PATIENT: {
    BASE: '/patients',
    INTERNAL_URL: process.env.PATIENT_SERVICE_URL || 'http://localhost:3002',
  },
  APPOINTMENT: {
    BASE: '/appointments',
    INTERNAL_URL: process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3003',
  },
  BILLING: {
    BASE: '/billing',
    INTERNAL_URL: process.env.BILLING_SERVICE_URL || 'http://localhost:3004',
  },
} as const;