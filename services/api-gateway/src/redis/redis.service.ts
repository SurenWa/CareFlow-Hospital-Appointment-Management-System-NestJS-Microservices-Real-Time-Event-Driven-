import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../config';

/**
 * Redis service for caching, rate limiting, and session management
 *
 * Usage in API Gateway:
 * 1. Cache validated JWT payloads (avoid re-validation)
 * 2. Rate limiting counters
 * 3. WebSocket session tracking across instances
 * 4. Blacklisted tokens (logout)
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client: Redis;
    private subscriber: Redis; // Separate connection for pub/sub
    private readonly logger = new Logger(RedisService.name);

    // Key prefixes for organization
    private readonly PREFIX = {
        SESSION: 'session:',
        RATE_LIMIT: 'rate:',
        TOKEN_BLACKLIST: 'blacklist:',
        WS_SESSION: 'ws:session:',
        USER_SOCKETS: 'ws:user:',
    };

    constructor(private config: AppConfigService) {}

    async onModuleInit() {
        const redisConfig = this.config.redis;

        this.client = new Redis({
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            db: redisConfig.db,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                this.logger.warn(`Redis connection retry #${times}, waiting ${delay}ms`);
                return delay;
            },
            maxRetriesPerRequest: 3,
        });

        // Separate connection for pub/sub (required by Redis)
        this.subscriber = new Redis({
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            db: redisConfig.db,
        });

        this.client.on('connect', () => {
            this.logger.log('Redis client connected');
        });

        this.client.on('error', (err) => {
            this.logger.error('Redis client error:', err);
        });

        // Verify connection
        try {
            await this.client.ping();
            this.logger.log('Redis connection verified');
        } catch (error) {
            this.logger.error('Failed to connect to Redis', error);
            throw error;
        }
    }

    async onModuleDestroy() {
        await this.client?.quit();
        await this.subscriber?.quit();
        this.logger.log('Redis connections closed');
    }

    // ==================== Basic Operations ====================

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds) {
            await this.client.setex(key, ttlSeconds, value);
        } else {
            await this.client.set(key, value);
        }
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }

    async exists(key: string): Promise<boolean> {
        const result = await this.client.exists(key);
        return result === 1;
    }

    // ==================== Session Cache ====================

    async cacheUserSession(userId: string, sessionData: object, ttlSeconds: number): Promise<void> {
        const key = `${this.PREFIX.SESSION}${userId}`;
        await this.set(key, JSON.stringify(sessionData), ttlSeconds);
    }

    async getUserSession(userId: string): Promise<object | null> {
        const key = `${this.PREFIX.SESSION}${userId}`;
        const data = await this.get(key);
        return data ? JSON.parse(data) : null;
    }

    async invalidateUserSession(userId: string): Promise<void> {
        const key = `${this.PREFIX.SESSION}${userId}`;
        await this.del(key);
    }

    // ==================== Token Blacklist ====================

    async blacklistToken(jti: string, expiresInSeconds: number): Promise<void> {
        const key = `${this.PREFIX.TOKEN_BLACKLIST}${jti}`;
        await this.set(key, '1', expiresInSeconds);
    }

    async isTokenBlacklisted(jti: string): Promise<boolean> {
        const key = `${this.PREFIX.TOKEN_BLACKLIST}${jti}`;
        return this.exists(key);
    }

    // ==================== Rate Limiting ====================

    /**
     * Sliding window rate limiter
     * Returns: { allowed: boolean, remaining: number, resetIn: number }
     */
    async checkRateLimit(
        identifier: string,
        maxRequests: number,
        windowSeconds: number,
    ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
        const key = `${this.PREFIX.RATE_LIMIT}${identifier}`;
        const now = Date.now();
        const windowStart = now - windowSeconds * 1000;

        // Use Redis transaction for atomicity
        const multi = this.client.multi();

        // Remove old entries outside the window
        multi.zremrangebyscore(key, 0, windowStart);
        // Count current requests in window
        multi.zcard(key);
        // Add current request
        multi.zadd(key, now, `${now}`);
        // Set expiry on the key
        multi.expire(key, windowSeconds);

        const results = await multi.exec();
        const currentCount = (results?.[1]?.[1] as number) || 0;

        const allowed = currentCount < maxRequests;
        const remaining = Math.max(0, maxRequests - currentCount - 1);
        const resetIn = windowSeconds;

        return { allowed, remaining, resetIn };
    }

    // ==================== WebSocket Sessions ====================

    async registerWebSocketSession(
        socketId: string,
        userId: string,
        metadata: object,
    ): Promise<void> {
        // Store socket -> user mapping
        await this.set(
            `${this.PREFIX.WS_SESSION}${socketId}`,
            JSON.stringify({ userId, ...metadata }),
            3600, // 1 hour TTL
        );

        // Add socket to user's socket set (user can have multiple connections)
        await this.client.sadd(`${this.PREFIX.USER_SOCKETS}${userId}`, socketId);
        await this.client.expire(`${this.PREFIX.USER_SOCKETS}${userId}`, 3600);
    }

    async removeWebSocketSession(socketId: string, userId: string): Promise<void> {
        await this.del(`${this.PREFIX.WS_SESSION}${socketId}`);
        await this.client.srem(`${this.PREFIX.USER_SOCKETS}${userId}`, socketId);
    }

    async getUserSocketIds(userId: string): Promise<string[]> {
        return this.client.smembers(`${this.PREFIX.USER_SOCKETS}${userId}`);
    }

    // ==================== Pub/Sub for WebSocket Scaling ====================

    async publish(channel: string, message: object): Promise<void> {
        await this.client.publish(channel, JSON.stringify(message));
    }

    async subscribe(channel: string, callback: (message: object) => void): Promise<void> {
        await this.subscriber?.subscribe(channel);
        this.subscriber?.on('message', (ch, msg) => {
            if (ch === channel) {
                callback(JSON.parse(msg));
            }
        });
    }

    // ==================== Health Check ====================

    async ping(): Promise<boolean> {
        try {
            const result = await this.client.ping();
            return result === 'PONG';
        } catch {
            return false;
        }
    }
}
