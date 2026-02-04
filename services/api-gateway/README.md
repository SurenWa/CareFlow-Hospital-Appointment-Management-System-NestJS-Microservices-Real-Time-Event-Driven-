# API Gateway – CareFlow Hospital & Appointment Management System

## Overview

The API Gateway serves as the **central entry point** to the CareFlow platform. It handles **all client interactions**, including REST APIs, WebSocket connections, and request aggregation. The gateway is responsible for **auth validation**, **rate limiting**, **request forwarding to internal microservices**, and **real-time updates**.  

It integrates with **Redis** for caching and session management, **RabbitMQ** for event propagation, and provides **Swagger API documentation** for all exposed endpoints. The gateway is designed to be **scalable, secure, and production-ready**, supporting high traffic and multiple user roles (admin, doctor, nurse, patient).

---

## Table of Contents

- [Architecture](#architecture)
- [Key Responsibilities](#key-responsibilities)
- [WebSocket Integration](#websocket-integration)
- [Authentication & Authorization](#authentication--authorization)
- [Event Handling](#event-handling)
- [Redis Caching](#redis-caching)
- [API Documentation](#api-documentation)
- [Rate Limiting](#rate-limiting)
- [Observability & Metrics](#observability--metrics)
- [Deployment & Local Development](#deployment--local-development)
- [Environment Variables](#environment-variables)
- [Health Checks](#health-checks)
- [License](#license)

---

careflow/
├── package.json                              # Root monorepo config
├── packages/
│   └── shared/                               # Shared types & contracts
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           └── types/
│               ├── user.types.ts             # UserContext, Roles, Permissions
│               ├── events.types.ts           # RabbitMQ events
│               └── api.types.ts              # API response formats
├── services/
│   └── api-gateway/                          # THE GATEWAY (Phase 2 focus)
│       ├── package.json
│       ├── tsconfig.json
│       ├── nest-cli.json
│       ├── .env.local
│       └── src/
│           ├── main.ts                       # Bootstrap + Swagger
│           ├── app.module.ts                 # Root module
│           ├── config/                       # Typed configuration
│           │   ├── index.ts
│           │   ├── config.module.ts
│           │   ├── config.service.ts
│           │   └── config.validation.ts
│           ├── common/
│           │   ├── decorators/index.ts       # @CurrentUser, @Roles, @Public
│           │   ├── filters/
│           │   │   ├── index.ts
│           │   │   └── http-exception.filter.ts
│           │   └── interceptors/
│           │       ├── index.ts
│           │       ├── correlation.interceptor.ts
│           │       ├── logging.interceptor.ts
│           │       ├── timeout.interceptor.ts
│           │       └── transform.interceptor.ts
│           ├── auth/
│           │   ├── auth.module.ts
│           │   ├── strategies/jwt.strategy.ts
│           │   └── guards/
│           │       ├── index.ts
│           │       ├── jwt-auth.guard.ts
│           │       └── roles.guard.ts
│           ├── proxy/
│           │   ├── index.ts
│           │   ├── proxy.module.ts
│           │   ├── proxy.service.ts          # HTTP forwarding to services
│           │   └── controllers/
│           │       ├── auth-proxy.controller.ts
│           │       ├── patient-proxy.controller.ts
│           │       ├── appointment-proxy.controller.ts
│           │       ├── billing-proxy.controller.ts
│           │       └── dto/auth.dto.ts
│           ├── redis/
│           │   ├── index.ts
│           │   ├── redis.module.ts
│           │   └── redis.service.ts          # Caching, rate limiting, pub/sub
│           ├── websocket/
│           │   ├── websocket.module.ts
│           │   └── websocket.gateway.ts      # Real-time communication
│           └── health/
│               ├── health.module.ts
│               └── health.controller.ts      # Kubernetes probes
└── infrastructure/
    ├── docker/
    │   ├── docker-compose.yml                # Local infra
    │   ├── mongo-init.js
    │   └── postgres-init.sql
    ├── prometheus/
    │   └── prometheus.yml
    ├── grafana/
    │   └── provisioning/datasources/datasources.yml
    └── nginx/
        ├── nginx.conf
        └── locations.conf
