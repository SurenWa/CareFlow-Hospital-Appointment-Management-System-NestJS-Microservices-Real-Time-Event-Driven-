import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { Request } from 'express';
import { AppConfigService } from '../config';
import { INTERNAL_HEADERS, UserContext } from '@careflow/shared';

/**
 * Service targets for routing
 */
export enum ServiceTarget {
    AUTH = 'auth',
    PATIENT = 'patient',
    APPOINTMENT = 'appointment',
    BILLING = 'billing',
}

/**
 * Proxy Service
 *
 * This is the CORE of the API Gateway.
 * It forwards requests to internal services while:
 * - Injecting user context headers
 * - Adding correlation IDs
 * - Handling errors uniformly
 * - Managing timeouts
 *
 * Internal services TRUST these headers because they're
 * on an isolated network (only Gateway can reach them).
 */
@Injectable()
export class ProxyService {
    private readonly logger = new Logger(ProxyService.name);
    private readonly clients: Map<ServiceTarget, AxiosInstance>;

    constructor(private config: AppConfigService) {
        // Create axios instances for each service with base configuration
        this.clients = new Map();

        const serviceUrls = {
            [ServiceTarget.AUTH]: this.config.services.auth,
            [ServiceTarget.PATIENT]: this.config.services.patient,
            [ServiceTarget.APPOINTMENT]: this.config.services.appointment,
            [ServiceTarget.BILLING]: this.config.services.billing,
        };

        // Initialize HTTP clients for each service
        Object.entries(serviceUrls).forEach(([service, baseURL]) => {
            const client = axios.create({
                baseURL,
                timeout: 30000, // 30 second timeout
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            // Add response interceptor for logging
            client.interceptors.response.use(
                (response) => response,
                (error: AxiosError) => {
                    this.logger.error(
                        `[${service}] Request failed: ${error.message}`,
                        error.response?.data,
                    );
                    return Promise.reject(error);
                },
            );

            this.clients.set(service as ServiceTarget, client);
        });
    }

    /**
     * Forward a request to an internal service
     *
     * @param target - Which service to call
     * @param request - Original Express request
     * @param path - Path on the target service (e.g., '/users/123')
     * @param options - Additional axios options
     */
    async forward<T>(
        target: ServiceTarget,
        request: Request,
        path: string,
        options?: Partial<AxiosRequestConfig>,
    ): Promise<T> {
        const client = this.clients.get(target);
        if (!client) {
            throw new HttpException(
                `Unknown service target: ${target}`,
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }

        // Build headers to forward
        const headers = this.buildInternalHeaders(request);

        // Build request config
        const config: AxiosRequestConfig = {
            method: request.method as any,
            url: path,
            headers,
            ...options,
        };

        // Forward body for POST/PUT/PATCH
        if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
            config.data = request.body;
        }

        // Forward query params
        if (Object.keys(request.query).length > 0) {
            config.params = request.query;
        }

        try {
            this.logger.debug(`Forwarding ${request.method} ${path} to ${target}`);

            const response = await client.request<T>(config);
            return response.data;
        } catch (error) {
            throw this.handleProxyError(error, target);
        }
    }

    /**
     * Build headers for internal service communication
     * These headers carry user context and tracing information
     */
    private buildInternalHeaders(request: Request): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Add correlation ID for tracing
        const correlationId = (request as any).correlationId;
        if (correlationId) {
            headers[INTERNAL_HEADERS.CORRELATION_ID] = correlationId;
        }

        // Add request ID
        const requestId = (request as any).requestId;
        if (requestId) {
            headers[INTERNAL_HEADERS.REQUEST_ID] = requestId;
        }

        // Add user context from JWT (set by auth guard)
        const user = (request as any).user as UserContext;
        if (user) {
            headers[INTERNAL_HEADERS.USER_ID] = user.userId;
            headers[INTERNAL_HEADERS.USER_EMAIL] = user.email;
            headers[INTERNAL_HEADERS.USER_ROLES] = JSON.stringify(user.roles);
            headers[INTERNAL_HEADERS.USER_PERMISSIONS] = JSON.stringify(user.permissions);

            if (user.departmentId) {
                headers[INTERNAL_HEADERS.DEPARTMENT_ID] = user.departmentId;
            }
        }

        // Forward specific client headers if needed
        const forwardHeaders = ['accept-language', 'x-request-id'];
        forwardHeaders.forEach((header) => {
            const value = request.headers[header];
            if (value && typeof value === 'string') {
                headers[header] = value;
            }
        });

        return headers;
    }

    /**
     * Transform axios errors to NestJS HTTP exceptions
     */
    private handleProxyError(error: unknown, target: ServiceTarget): HttpException {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;

            // Service responded with an error
            if (axiosError.response) {
                const status = axiosError.response.status;
                const data = axiosError.response.data as any;

                // Forward the original error from the service
                return new HttpException(
                    {
                        message: data?.message || data?.error?.message || 'Service error',
                        code: data?.error?.code || 'UPSTREAM_ERROR',
                        details: data?.error?.details,
                        service: target,
                    },
                    status,
                );
            }

            // Service didn't respond (timeout, network error)
            if (axiosError.code === 'ECONNREFUSED') {
                this.logger.error(`Service ${target} is unreachable`);
                return new HttpException(
                    {
                        message: `Service temporarily unavailable`,
                        code: 'SERVICE_UNAVAILABLE',
                        service: target,
                    },
                    HttpStatus.SERVICE_UNAVAILABLE,
                );
            }

            if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ECONNABORTED') {
                this.logger.error(`Service ${target} timed out`);
                return new HttpException(
                    {
                        message: 'Service request timed out',
                        code: 'GATEWAY_TIMEOUT',
                        service: target,
                    },
                    HttpStatus.GATEWAY_TIMEOUT,
                );
            }
        }

        // Unknown error
        this.logger.error(`Unexpected proxy error for ${target}:`, error);
        return new HttpException(
            {
                message: 'An unexpected error occurred',
                code: 'INTERNAL_ERROR',
            },
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }

    /**
     * Health check for a specific service
     */
    async checkServiceHealth(target: ServiceTarget): Promise<boolean> {
        const client = this.clients.get(target);
        if (!client) return false;

        try {
            const response = await client.get('/health', { timeout: 5000 });
            return response.status === 200;
        } catch {
            return false;
        }
    }
}
