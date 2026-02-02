import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse, ErrorCode } from '@careflow/shared';

/**
 * Global HTTP Exception Filter
 *
 * Catches all exceptions and transforms them into a consistent API response format.
 * This ensures clients always receive predictable error structures.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        // Determine status code
        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        // Extract error details
        let errorCode = ErrorCode.INTERNAL_ERROR;
        let message = 'An unexpected error occurred';
        let details: Record<string, unknown> | undefined;

        if (exception instanceof HttpException) {
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object') {
                const resp = exceptionResponse as Record<string, unknown>;
                message = (resp.message as string) || message;
                details = resp.details as Record<string, unknown>;

                // Handle class-validator errors
                if (Array.isArray(resp.message)) {
                    message = 'Validation failed';
                    details = { validationErrors: resp.message };
                    errorCode = ErrorCode.VALIDATION_ERROR;
                }
            }

            // Map HTTP status to error codes
            errorCode = this.mapStatusToErrorCode(status);
        }

        // Log the error
        const correlationId = (request as any).correlationId || request.headers['x-correlation-id'];

        if (status >= 500) {
            this.logger.error(
                `[${correlationId}] ${request.method} ${request.url} - ${status} - ${message}`,
                exception instanceof Error ? exception.stack : undefined,
            );
        } else {
            this.logger.warn(
                `[${correlationId}] ${request.method} ${request.url} - ${status} - ${message}`,
            );
        }

        // Build response
        const errorResponse: ApiResponse = {
            success: false,
            error: {
                code: errorCode,
                message,
                details,
                // Only include stack trace in development
                stack:
                    process.env.NODE_ENV === 'development' && exception instanceof Error
                        ? exception.stack
                        : undefined,
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: correlationId,
            },
        };

        response.status(status).json(errorResponse);
    }

    private mapStatusToErrorCode(status: number): ErrorCode {
        const statusCodeMap: Record<number, ErrorCode> = {
            400: ErrorCode.BAD_REQUEST,
            401: ErrorCode.UNAUTHORIZED,
            403: ErrorCode.FORBIDDEN,
            404: ErrorCode.NOT_FOUND,
            409: ErrorCode.CONFLICT,
            422: ErrorCode.VALIDATION_ERROR,
            429: ErrorCode.RATE_LIMITED,
            500: ErrorCode.INTERNAL_ERROR,
            502: ErrorCode.UPSTREAM_ERROR,
            503: ErrorCode.SERVICE_UNAVAILABLE,
            504: ErrorCode.GATEWAY_TIMEOUT,
        };

        return statusCodeMap[status] || ErrorCode.INTERNAL_ERROR;
    }
}
