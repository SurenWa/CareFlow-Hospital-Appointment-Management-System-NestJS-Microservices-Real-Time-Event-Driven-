import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Logging Interceptor
 *
 * Provides structured logging for all HTTP requests.
 * Logs: method, path, status, duration, user ID, correlation ID
 *
 * In production, these logs feed into observability tools.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const { method, originalUrl, ip } = request;
        const correlationId = (request as any).correlationId;
        const userAgent = request.get('user-agent') || '';
        const userId = (request as any).user?.userId || 'anonymous';

        const startTime = Date.now();

        // Log request
        this.logger.log({
            type: 'request',
            correlationId,
            method,
            path: originalUrl,
            userId,
            ip,
            userAgent: userAgent.substring(0, 100), // Truncate for readability
        });

        return next.handle().pipe(
            tap({
                next: () => {
                    const duration = Date.now() - startTime;
                    const { statusCode } = response;

                    this.logger.log({
                        type: 'response',
                        correlationId,
                        method,
                        path: originalUrl,
                        statusCode,
                        duration: `${duration}ms`,
                        userId,
                    });
                },
                error: (error) => {
                    const duration = Date.now() - startTime;
                    const statusCode = error.status || 500;

                    this.logger.error({
                        type: 'response',
                        correlationId,
                        method,
                        path: originalUrl,
                        statusCode,
                        duration: `${duration}ms`,
                        userId,
                        error: error.message,
                    });
                },
            }),
        );
    }
}
