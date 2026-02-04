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
    private readonly SERVICE_NAME = 'patient-service';

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
                    // Assert exchange
                    await channel.assertExchange(RABBITMQ_CONFIG.EXCHANGE, 'topic', {
                        durable: true,
                    });

                    // Assert queue for consuming user events
                    await channel.assertQueue(RABBITMQ_CONFIG.QUEUES.PATIENT_EVENTS, {
                        durable: true,
                    });

                    // Bind queue to listen for user.created events
                    await channel.bindQueue(
                        RABBITMQ_CONFIG.QUEUES.PATIENT_EVENTS,
                        RABBITMQ_CONFIG.EXCHANGE,
                        'user.created',
                    );

                    this.logger.log('RabbitMQ exchange and queues ready');
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

    async consume(
        queue: string,
        callback: (message: BaseEvent<any>) => Promise<void>,
    ): Promise<void> {
        await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
            await channel.consume(queue, async (msg) => {
                if (msg) {
                    try {
                        const event = JSON.parse(msg.content.toString()) as BaseEvent<any>;
                        this.logger.debug(`Received event: ${event.eventName} [${event.eventId}]`);
                        await callback(event);
                        channel.ack(msg);
                    } catch (error) {
                        this.logger.error('Error processing message', error);
                        channel.nack(msg, false, false); // Don't requeue failed messages
                    }
                }
            });
        });
    }

    isConnected(): boolean {
        return this.connection?.isConnected() || false;
    }
}