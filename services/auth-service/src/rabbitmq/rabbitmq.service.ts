import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { AppConfigService } from '../config';
import { BaseEvent, EventName, RABBITMQ_CONFIG } from '@careflow/shared';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RabbitMQService.name);
    private connection: amqp.AmqpConnectionManager;
    private channelWrapper: amqp.ChannelWrapper;
    private readonly SERVICE_NAME = 'auth-service';

    constructor(private config: AppConfigService) { }

    async onModuleInit() {
        await this.connect();
    }

    async onModuleDestroy() {
        await this.disconnect();
    }

    private async connect(): Promise<void> {
        try {
            this.connection = amqp.connect([this.config.rabbitmqUrl], {
                heartbeatIntervalInSeconds: 30,
                reconnectTimeInSeconds: 5,
            });

            this.connection.on('connect', () => {
                this.logger.log('Connected to RabbitMQ');
            });

            this.connection.on('disconnect', (err: any) => {
                this.logger.warn('Disconnected from RabbitMQ', err?.message);
            });

            this.channelWrapper = this.connection.createChannel({
                json: true,
                setup: async (channel: ConfirmChannel) => {
                    await channel.assertExchange(RABBITMQ_CONFIG.EXCHANGE, 'topic', {
                        durable: true,
                    });
                    this.logger.log(`Exchange '${RABBITMQ_CONFIG.EXCHANGE}' ready`);
                },
            });

            await this.channelWrapper.waitForConnect();
            this.logger.log('RabbitMQ channel ready');
        } catch (error) {
            this.logger.error('Failed to connect to RabbitMQ', error);
            throw error;
        }
    }

    private async disconnect(): Promise<void> {
        try {
            await this.channelWrapper?.close();
            await this.connection?.close();
            this.logger.log('Disconnected from RabbitMQ');
        } catch (error) {
            this.logger.error('Error disconnecting from RabbitMQ', error);
        }
    }

    async publishEvent<T>(
        eventName: EventName,
        payload: T,
        correlationId?: string,
    ): Promise<void> {
        const event: BaseEvent<T> = {
            eventId: uuidv4(),
            eventName,
            timestamp: new Date().toISOString(),
            correlationId: correlationId || uuidv4(),
            source: this.SERVICE_NAME,
            version: '1.0.0',
            payload,
        };

        const routingKey = eventName;

        try {
            await this.channelWrapper.publish(
                RABBITMQ_CONFIG.EXCHANGE,
                routingKey,
                event,
                {
                    persistent: true,
                    contentType: 'application/json',
                    messageId: event.eventId,
                    correlationId: event.correlationId,
                    timestamp: Date.now(),
                },
            );

            this.logger.debug(`Published event: ${eventName} [${event.eventId}]`);
        } catch (error) {
            this.logger.error(`Failed to publish event: ${eventName}`, error);
            throw error;
        }
    }

    isConnected(): boolean {
        return this.connection?.isConnected() || false;
    }
}