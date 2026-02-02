import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

/**
 * Timeout Interceptor
 *
 * Ensures requests don't hang indefinitely.
 * Critical for API Gateway - we can't let slow downstream services
 * tie up our connection pool.
 *
 * Default: 30 seconds (configurable per route if needed)
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
    private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        return next.handle().pipe(
            timeout(this.DEFAULT_TIMEOUT),
            catchError((err) => {
                if (err instanceof TimeoutError) {
                    return throwError(
                        () =>
                            new RequestTimeoutException(
                                'Request timeout - service took too long to respond',
                            ),
                    );
                }
                return throwError(() => err);
            }),
        );
    }
}
