import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { INTERNAL_HEADERS } from '@careflow/shared';

/**
 * Correlation ID Interceptor
 *
 * Ensures every request has a unique correlation ID for distributed tracing.
 * If client sends one, we use it. Otherwise, we generate one.
 *
 * This ID follows the request through all internal services,
 * making it possible to trace a single user action across the entire system.
 */
@Injectable()
export class CorrelationInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        // Use existing correlation ID or generate new one
        const correlationId =
            (request.headers[INTERNAL_HEADERS.CORRELATION_ID] as string) || uuidv4();

        // Generate unique request ID for this specific request
        const requestId = uuidv4();

        // Attach to request object for use in services
        (request as any).correlationId = correlationId;
        (request as any).requestId = requestId;

        // Set headers on request (for forwarding to internal services)
        request.headers[INTERNAL_HEADERS.CORRELATION_ID] = correlationId;
        request.headers[INTERNAL_HEADERS.REQUEST_ID] = requestId;

        // Set headers on response (for client debugging)
        response.setHeader(INTERNAL_HEADERS.CORRELATION_ID, correlationId);
        response.setHeader(INTERNAL_HEADERS.REQUEST_ID, requestId);

        return next.handle();
    }
}
