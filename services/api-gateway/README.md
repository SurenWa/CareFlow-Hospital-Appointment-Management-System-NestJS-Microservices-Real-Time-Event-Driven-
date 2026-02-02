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


