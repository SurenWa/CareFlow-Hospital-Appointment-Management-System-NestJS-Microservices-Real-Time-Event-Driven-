import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { ApiResponse } from '@careflow/shared';

/**
 * Transform Interceptor
 *
 * Wraps all successful responses in a standard ApiResponse format.
 * This ensures consistent response structure across all endpoints.
 *
 * Before: { id: 1, name: "John" }
 * After:  { success: true, data: { id: 1, name: "John" }, meta: {...} }
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
        const request = context.switchToHttp().getRequest<Request>();
        const correlationId = (request as any).correlationId;

        return next.handle().pipe(
            map((data) => {
                // If response is already in ApiResponse format, return as-is
                if (this.isApiResponse(data)) {
                    return data as unknown as ApiResponse<T>;
                }

                // Wrap raw data in standard format
                return {
                    success: true,
                    data,
                    meta: {
                        timestamp: new Date().toISOString(),
                        requestId: correlationId,
                    },
                };
            }),
        );
    }

    private isApiResponse(data: unknown): boolean {
        if (typeof data !== 'object' || data === null) {
            return false;
        }
        return 'success' in data && ('data' in data || 'error' in data);
    }
}
