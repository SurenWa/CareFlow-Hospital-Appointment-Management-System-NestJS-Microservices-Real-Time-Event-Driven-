/**
 * Event types for RabbitMQ messaging
 * These define the contract for async communication between services
 */

// All event names in the system - single source of truth
export enum EventName {
    // Auth events
    USER_CREATED = 'user.created',
    USER_UPDATED = 'user.updated',
    USER_DELETED = 'user.deleted',
    USER_LOGIN = 'user.login',
    USER_LOGOUT = 'user.logout',
    PASSWORD_RESET_REQUESTED = 'password.reset.requested',

    // Patient events
    PATIENT_CREATED = 'patient.created',
    PATIENT_UPDATED = 'patient.updated',
    PATIENT_DELETED = 'patient.deleted',
    MEDICAL_RECORD_UPLOADED = 'medical.record.uploaded',

    // Appointment events
    APPOINTMENT_CREATED = 'appointment.created',
    APPOINTMENT_UPDATED = 'appointment.updated',
    APPOINTMENT_CONFIRMED = 'appointment.confirmed',
    APPOINTMENT_CANCELLED = 'appointment.cancelled',
    APPOINTMENT_COMPLETED = 'appointment.completed',
    APPOINTMENT_NO_SHOW = 'appointment.no_show',

    // Billing events
    PAYMENT_PENDING = 'payment.pending',
    PAYMENT_COMPLETED = 'payment.completed',
    PAYMENT_FAILED = 'payment.failed',
    PAYMENT_REFUNDED = 'payment.refunded',
    INVOICE_GENERATED = 'invoice.generated',

    // Notification events (internal)
    NOTIFICATION_SEND = 'notification.send',
    NOTIFICATION_SENT = 'notification.sent',
    NOTIFICATION_FAILED = 'notification.failed',
}

// Base event structure - all events extend this
export interface BaseEvent<T = unknown> {
    eventId: string; // Unique event ID for idempotency
    eventName: EventName;
    timestamp: string; // ISO 8601
    correlationId: string; // For tracing across services
    source: string; // Which service emitted this
    version: string; // Event schema version
    payload: T;
}

// Specific event payloads
export interface UserCreatedPayload {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
}

export interface AppointmentCreatedPayload {
    appointmentId: string;
    patientId: string;
    doctorId: string;
    scheduledAt: string;
    durationMinutes: number;
    type: string;
    status: string;
}

export interface AppointmentConfirmedPayload {
    appointmentId: string;
    patientId: string;
    doctorId: string;
    scheduledAt: string;
    paymentId: string;
}

export interface PaymentCompletedPayload {
    paymentId: string;
    appointmentId: string;
    amount: number;
    currency: string;
    stripePaymentIntentId: string;
}

export interface NotificationSendPayload {
    recipientId: string;
    recipientEmail: string;
    type: 'email' | 'in_app' | 'push';
    template: string;
    data: Record<string, unknown>;
}

// RabbitMQ exchange and queue names
export const RABBITMQ_CONFIG = {
    EXCHANGE: 'careflow.events',
    QUEUES: {
        AUTH_EVENTS: 'auth.events',
        PATIENT_EVENTS: 'patient.events',
        APPOINTMENT_EVENTS: 'appointment.events',
        BILLING_EVENTS: 'billing.events',
        NOTIFICATION_EVENTS: 'notification.events',
        AUDIT_EVENTS: 'audit.events',
    },
    ROUTING_KEYS: {
        AUTH: 'auth.*',
        PATIENT: 'patient.*',
        APPOINTMENT: 'appointment.*',
        BILLING: 'billing.*',
        NOTIFICATION: 'notification.*',
        ALL: '#', // Audit service listens to everything
    },
} as const;