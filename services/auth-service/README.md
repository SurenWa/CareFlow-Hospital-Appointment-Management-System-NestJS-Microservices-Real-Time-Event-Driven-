🏥 CareFlow — Phase 3: Auth Service
PHASE 3: Auth Service (MongoDB + Mongoose)
Now we're building the identity backbone of the entire system. This service is responsible for:

User registration and management
Password hashing and verification
JWT token issuance (access + refresh tokens)
Role and permission management
Publishing auth events to RabbitMQ

┌─────────────────────────────────────────────────────────────────────┐
│                         AUTH SERVICE                                │
│                                                                     │
│  OWNS:                          DOES NOT OWN:                       │
│  ├─ User credentials            ├─ Patient medical data             │
│  ├─ Password hashes             ├─ Appointment details              │
│  ├─ Roles & permissions         ├─ Billing information              │
│  ├─ Refresh tokens              └─ Notification preferences         │
│  └─ Login history                                                   │
│                                                                     │
│  ISSUES:                        VALIDATES:                          │
│  ├─ Access tokens (JWT)         └─ (Gateway validates, not Auth)    │
│  └─ Refresh tokens                                                  │
│                                                                     │
│  PUBLISHES EVENTS:                                                  │
│  ├─ user.created                                                    │
│  ├─ user.updated                                                    │
│  ├─ user.login                                                      │
│  └─ password.reset.requested                                        │
└─────────────────────────────────────────────────────────────────────┘

Key Principle: Auth Service issues tokens, Gateway validates them. This separation allows Gateway to validate without hitting Auth Service on every request.