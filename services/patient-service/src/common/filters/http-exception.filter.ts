import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse, ErrorCode, INTERNAL_HEADERS } from '@careflow/shared';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

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

                if (Array.isArray(resp.message)) {
                    message = 'Validation failed';
                    details = { validationErrors: resp.message };
                    errorCode = ErrorCode.VALIDATION_ERROR;
                }
            }

            errorCode = this.mapStatusToErrorCode(status);
        }

        const correlationId = request.headers[INTERNAL_HEADERS.CORRELATION_ID] as string;

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

        const errorResponse: ApiResponse = {
            success: false,
            error: {
                code: errorCode,
                message,
                details,
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
        };

        return statusCodeMap[status] || ErrorCode.INTERNAL_ERROR;
    }
}