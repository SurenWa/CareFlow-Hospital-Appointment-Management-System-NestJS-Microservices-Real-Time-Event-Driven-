import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
    WsException,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../redis/redis.service';
import { AppConfigService } from '../config';
import { JwtPayload, UserContext } from '@careflow/shared';

/**
 * WebSocket Authentication Guard
 * Validates JWT token from connection handshake
 */
class WsJwtGuard {
    constructor(
        private jwtService: JwtService,
        private config: AppConfigService,
    ) {}

    async validateToken(token: string): Promise<UserContext> {
        try {
            const payload = this.jwtService.verify<JwtPayload>(token, {
                secret: this.config.jwt.secret,
            });

            return {
                userId: payload.sub,
                email: payload.email,
                roles: payload.roles,
                permissions: payload.permissions,
                departmentId: payload.departmentId,
            };
        } catch (error) {
            throw new WsException('Invalid token');
        }
    }
}

/**
 * Extended Socket interface with user context
 */
interface AuthenticatedSocket extends Socket {
    user: UserContext;
}

/**
 * WebSocket Gateway
 *
 * Handles real-time communication for:
 * - Appointment status updates
 * - Patient status changes
 * - Notifications
 * - Live dashboard updates
 *
 * IMPORTANT: WebSockets are ONLY exposed at Gateway level.
 * Internal services communicate via RabbitMQ events.
 * Gateway subscribes to relevant events and pushes to connected clients.
 */
@WebSocketGateway({
    namespace: '/ws',
    cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
    },
    transports: ['websocket', 'polling'],
})
export class CareFlowWebSocketGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(CareFlowWebSocketGateway.name);
    private wsGuard: WsJwtGuard;

    // Room naming conventions
    private readonly ROOMS = {
        USER: (userId: string) => `user:${userId}`,
        DOCTOR: (doctorId: string) => `doctor:${doctorId}`,
        PATIENT: (patientId: string) => `patient:${patientId}`,
        APPOINTMENT: (appointmentId: string) => `appointment:${appointmentId}`,
        DEPARTMENT: (departmentId: string) => `department:${departmentId}`,
        ADMIN: 'admin',
    };

    constructor(
        private jwtService: JwtService,
        private redis: RedisService,
        private config: AppConfigService,
    ) {
        this.wsGuard = new WsJwtGuard(jwtService, config);
    }

    afterInit(server: Server) {
        this.logger.log('WebSocket Gateway initialized');

        // Set up Redis pub/sub for scaling across multiple Gateway instances
        this.setupRedisPubSub();
    }

    /**
     * Handle new WebSocket connections
     * Validates JWT and sets up user context
     */
    async handleConnection(client: Socket) {
        try {
            // Extract token from handshake
            const token =
                client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.replace('Bearer ', '');

            if (!token) {
                this.logger.warn(`Connection rejected: No token provided`);
                client.emit('error', { message: 'Authentication required' });
                client.disconnect();
                return;
            }

            // Validate token
            const user = await this.wsGuard.validateToken(token);
            (client as AuthenticatedSocket).user = user;

            // Register socket in Redis for scaling
            await this.redis.registerWebSocketSession(client.id, user.userId, {
                roles: user.roles,
                connectedAt: new Date().toISOString(),
            });

            // Auto-join user to their personal room
            client.join(this.ROOMS.USER(user.userId));

            // Join role-based rooms
            if (user.roles.includes('admin' as any)) {
                client.join(this.ROOMS.ADMIN);
            }

            if (user.departmentId) {
                client.join(this.ROOMS.DEPARTMENT(user.departmentId));
            }

            this.logger.log(
                `Client connected: ${client.id} | User: ${user.userId} | Roles: ${user.roles.join(', ')}`,
            );

            // Send connection confirmation
            client.emit('connected', {
                socketId: client.id,
                userId: user.userId,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            this.logger.error(`Connection error: ${error.message}`);
            client.emit('error', { message: 'Authentication failed' });
            client.disconnect();
        }
    }

    /**
     * Handle disconnections
     */
    async handleDisconnect(client: AuthenticatedSocket) {
        const userId = client.user?.userId;

        if (userId) {
            await this.redis.removeWebSocketSession(client.id, userId);
            this.logger.log(`Client disconnected: ${client.id} | User: ${userId}`);
        }
    }

    // ==================== Client Message Handlers ====================

    /**
     * Subscribe to appointment updates
     */
    @SubscribeMessage('subscribe:appointment')
    handleSubscribeAppointment(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { appointmentId: string },
    ) {
        const room = this.ROOMS.APPOINTMENT(data.appointmentId);
        client.join(room);
        this.logger.debug(`User ${client.user.userId} subscribed to ${room}`);

        return { event: 'subscribed', data: { room, appointmentId: data.appointmentId } };
    }

    /**
     * Unsubscribe from appointment updates
     */
    @SubscribeMessage('unsubscribe:appointment')
    handleUnsubscribeAppointment(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { appointmentId: string },
    ) {
        const room = this.ROOMS.APPOINTMENT(data.appointmentId);
        client.leave(room);

        return { event: 'unsubscribed', data: { room } };
    }

    /**
     * Subscribe to patient updates (for doctors/nurses)
     */
    @SubscribeMessage('subscribe:patient')
    handleSubscribePatient(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { patientId: string },
    ) {
        // Check if user has permission to view this patient
        const { roles } = client.user;
        if (!roles.some((r) => ['admin', 'doctor', 'nurse'].includes(r))) {
            throw new WsException('Insufficient permissions');
        }

        const room = this.ROOMS.PATIENT(data.patientId);
        client.join(room);

        return { event: 'subscribed', data: { room, patientId: data.patientId } };
    }

    /**
     * Ping/pong for connection health check
     */
    @SubscribeMessage('ping')
    handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
        return { event: 'pong', data: { timestamp: Date.now() } };
    }

    // ==================== Server-side Event Broadcasting ====================

    /**
     * Broadcast appointment status change to relevant parties
     */
    broadcastAppointmentUpdate(
        appointmentId: string,
        patientId: string,
        doctorId: string,
        data: any,
    ) {
        // Emit to appointment room
        this.server.to(this.ROOMS.APPOINTMENT(appointmentId)).emit('appointment:updated', data);

        // Emit to patient
        this.server.to(this.ROOMS.USER(patientId)).emit('appointment:updated', data);

        // Emit to doctor
        this.server.to(this.ROOMS.USER(doctorId)).emit('appointment:updated', data);

        this.logger.debug(`Broadcast appointment update: ${appointmentId}`);
    }

    /**
     * Send notification to specific user
     */
    sendNotificationToUser(userId: string, notification: any) {
        this.server.to(this.ROOMS.USER(userId)).emit('notification', notification);
    }

    /**
     * Broadcast to all admins
     */
    broadcastToAdmins(event: string, data: any) {
        this.server.to(this.ROOMS.ADMIN).emit(event, data);
    }

    /**
     * Broadcast to department
     */
    broadcastToDepartment(departmentId: string, event: string, data: any) {
        this.server.to(this.ROOMS.DEPARTMENT(departmentId)).emit(event, data);
    }

    // ==================== Redis Pub/Sub for Scaling ====================

    /**
     * Set up Redis pub/sub for multi-instance scaling
     *
     * When running multiple Gateway instances behind a load balancer,
     * a message needs to reach users connected to ANY instance.
     * Redis pub/sub broadcasts across all instances.
     */
    private async setupRedisPubSub() {
        const CHANNEL = 'careflow:websocket:broadcast';

        await this.redis.subscribe(CHANNEL, (message: any) => {
            const { event, room, data } = message;

            if (room) {
                this.server.to(room).emit(event, data);
            } else {
                this.server.emit(event, data);
            }
        });

        this.logger.log('Redis pub/sub initialized for WebSocket scaling');
    }

    /**
     * Publish event across all Gateway instances
     */
    async publishToAll(event: string, data: any, room?: string) {
        const CHANNEL = 'careflow:websocket:broadcast';
        await this.redis.publish(CHANNEL, { event, data, room });
    }
}
