# CareFlow – Hospital & Appointment Management System

## Overview

CareFlow is a comprehensive, high-scale hospital and appointment management platform designed to manage patient care, appointments, billing, notifications, and audit logs in a secure, real-time environment. The system is built using a **microservices architecture** to ensure modularity, scalability, and maintainability. It incorporates **event-driven communication**, **WebSocket-based real-time updates**, multiple databases tailored to service requirements, and is designed to operate in **local and containerized environments** with full Kubernetes support.

The platform supports multiple roles including **doctors, nurses, administrative staff, and patients**, providing role-based access control (RBAC) and attribute-based access control (ABAC) for fine-grained permissions. The system includes **real-time patient status tracking**, **appointment scheduling**, **payment reconciliation**, **notification management**, and **audit logging** for compliance.

---

## Table of Contents

- [Architecture](#architecture)
- [Services](#services)
- [Database Design](#database-design)
- [Event-Driven Communication](#event-driven-communication)
- [Authentication & Authorization](#authentication--authorization)
- [WebSockets](#websockets)
- [Image Management](#image-management)
- [Payment Gateway](#payment-gateway)
- [Caching & Redis](#caching--redis)
- [API Documentation](#api-documentation)
- [Observability](#observability)
- [Deployment](#deployment)
- [Local Development Setup](#local-development-setup)
- [Kubernetes Deployment](#kubernetes-deployment)
- [CI/CD Considerations](#cicd-considerations)
- [Health Checks & Metrics](#health-checks--metrics)
- [Contributing](#contributing)
- [License](#license)

---

## Architecture

The system follows a **microservices architecture**, with the following characteristics:

- **API Gateway**: Exposes all client endpoints via REST and WebSocket. Handles authentication, input validation, rate limiting, request aggregation, and WebSocket event bridging.
- **Auth Service**: Handles user registration, login, role management, JWT issuance, and event emission (`user.registered`).
- **Patient Service**: Manages patient profiles and medical record metadata. Integrates with Cloudinary for document and image uploads.
- **Appointment Service**: Handles appointment scheduling, lifecycle management, and status updates. Maintains idempotency and event-driven updates.
- **Billing Service**: Integrates with Stripe for payment processing, manages payment intents, and reconciles successful and failed payments.
- **Notification Service**: Provides email, in-app, and WebSocket notifications. Consumes events from other services for user notifications.
- **Audit Service**: Stores immutable logs of all actions and events for compliance and monitoring.

**Event-Driven Backbone**: RabbitMQ is used for asynchronous communication between services. Services communicate synchronously only when strictly required, typically for read operations or validation.

**Real-time Communication**: WebSockets are used exclusively at the API Gateway to deliver live updates to clients.

**Scalability & Observability**: Services are stateless, deployable via Docker containers, orchestrated using Kubernetes, and monitored using Prometheus and Grafana. Redis is used for caching, WebSocket session management, and idempotency.

---

## Services

### 1. API Gateway
- **Responsibilities**: REST API routing, WebSocket connections, JWT validation, aggregation of responses.
- **Technologies**: NestJS, WebSocket Gateway, Redis, Swagger, class-validator.
- **Endpoints**:
  - `/auth/login`
  - `/auth/register`
  - `/patients/:id`
  - `/appointments`
  - `/payments/initiate`
- **WebSocket Events**:
  - `booking-status-update`
  - `payment-status-update`
  - `notification`

### 2. Auth Service (MongoDB + Mongoose)
- **Responsibilities**: User authentication, role management, JWT issuance, event emission.
- **Collections**:
  - `users`: stores user credentials, roles, and metadata.
  - `refreshTokens`: maintains valid refresh tokens for session management.
- **Events**:
  - `user.registered`

### 3. Patient Service (Postgres + Prisma)
- **Responsibilities**: Manages patient profiles, medical record metadata, Cloudinary document/image uploads.
- **Tables**:
  - `patients`: stores patient details and links to medical records.
  - `medical_records`: metadata about uploaded documents/images.
- **Integrations**:
  - Cloudinary for storing and retrieving images and medical documents.

### 4. Appointment Service (Postgres + Drizzle ORM)
- **Responsibilities**: Handles appointment creation, status management, rescheduling, and cancellation.
- **Tables**:
  - `appointments`: stores appointment details, status, timestamps.
- **Features**:
  - Idempotency keys to prevent duplicate bookings.
  - Event-driven updates for notifications and billing.

### 5. Billing Service (Postgres + Prisma + Stripe)
- **Responsibilities**: Manages payment intents, payment processing via Stripe, and reconciliation.
- **Tables**:
  - `payments`: stores payment status, amounts, timestamps, and transaction IDs.
- **Events**:
  - `payment.completed`
  - `payment.failed`
- **Features**:
  - Stripe webhook handling.
  - Event-driven updates for notifications.

### 6. Notification Service (MongoDB + Mongoose)
- **Responsibilities**: Handles email, in-app, and WebSocket notifications.
- **Collections**:
  - `notifications`: stores notification payloads, user IDs, read/unread status.
- **Event Consumers**:
  - `booking.created`
  - `payment.completed`
- **WebSocket Integration**:
  - Events pushed through API Gateway.

### 7. Audit Service (MongoDB + Mongoose)
- **Responsibilities**: Maintains immutable logs of all actions, API calls, and system events.
- **Collections**:
  - `audit_logs`: structured logs with timestamps, user ID, action, service, and metadata.
- **Compliance**:
  - Designed for regulatory standards and long-term retention.

---

## Database Design

- **MongoDB**: Auth, Notification, Audit services.
- **Postgres**: Patient, Appointment, Billing services.
- **Redis**: Caching for sessions, rate limiting, idempotency keys, WebSocket session tracking.
- **ORMs**:
  - Mongoose → MongoDB
  - Prisma → Postgres (Patient, Billing)
  - Drizzle ORM → Postgres (Appointment)

---

## Event-Driven Communication

- **Event Bus**: RabbitMQ with topic exchanges.
- **Event Examples**:
  - `user.registered`
  - `appointment.created`
  - `appointment.status.updated`
  - `payment.completed`
- **Event Patterns**:
  - Services emit events about their own data.
  - Services consume events to trigger side effects or notifications.
  - Idempotency is enforced for all event consumers.

---

## Authentication & Authorization

- JWT-based authentication.
- RBAC (admin, doctor, nurse, patient).
- ABAC for fine-grained permission enforcement.
- API Gateway validates JWT before routing requests.
- Internal services validate claims when processing events.

---

## WebSockets

- Exclusively at API Gateway.
- Real-time updates for:
  - Patient status changes
  - Appointment status updates
  - Payment notifications
- Authenticated via JWT during handshake.
- Redis integration for horizontal scaling and session management.

---

## Image Management

- Cloudinary integration for uploading:
  - Profile pictures
  - Medical documents
  - Appointment-related files
- Images are stored in Cloudinary; metadata is stored in Patient service.

---

## Payment Gateway

- Stripe integration for billing and payments.
- Supports:
  - Payment intents
  - Payment confirmation via webhooks
  - Reconciliation between billing and appointment services
- Payment events trigger notifications and audit logging.

---

## Caching & Redis

- Redis used for:
  - JWT session caching
  - Rate limiting at API Gateway
  - WebSocket session management
  - Idempotency keys for Appointment service

---

## API Documentation

- Swagger (OpenAPI) is implemented at API Gateway and Auth service.
- DTO-first design ensures type safety and validation.
- Provides interactive documentation for all REST endpoints.

---

## Observability

- Prometheus metrics exposed by all services.
- Grafana dashboards for system health, request latency, event queues, payment success/failure rates.
- Correlation IDs for tracing requests across services.
- Structured logging for audit and debugging.

---

## Deployment

### Local Development
- Docker Compose sets up:
  - API Gateway
  - All microservices
  - MongoDB, Postgres, Redis
  - RabbitMQ
  - Prometheus & Grafana
- Services are stateless and configurable via `.env.local`.
- NGINX acts as a reverse proxy and load balancer.

### Kubernetes Deployment
- Local Kubernetes cluster using **Minikube** or **Kind**.
- Each service has:
  - Deployment
  - ClusterIP Service
  - HPA (Horizontal Pod Autoscaler)
  - ConfigMaps & Secrets for environment variables
- NGINX ingress controller for external traffic.
- Rolling updates and health checks configured.

---


