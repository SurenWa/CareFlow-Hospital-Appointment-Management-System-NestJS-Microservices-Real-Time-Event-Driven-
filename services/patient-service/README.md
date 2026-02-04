┌─────────────────────────────────────────────────────────────────────┐
│                        PATIENT SERVICE                              │
│                                                                     │
│  Database: PostgreSQL (Relational - structured patient data)        │
│  ORM: Prisma (Type-safe, migrations, schema-first)                  │
│  Port: 3002                                                         │
│                                                                     │
│  ENDPOINTS:                                                         │
│  ├── GET    /patients           - List patients (paginated)         │
│  ├── GET    /patients/:id       - Get patient by ID                 │
│  ├── POST   /patients           - Create patient                    │
│  ├── PUT    /patients/:id       - Update patient                    │
│  ├── DELETE /patients/:id       - Soft delete patient               │
│  ├── GET    /patients/:id/medical-records                           │
│  └── POST   /patients/:id/medical-records                           │
│                                                                     │
│  EVENTS PUBLISHED:                                                  │
│  ├── patient.created                                                │
│  ├── patient.updated                                                │
│  └── medical.record.uploaded                                        │
│                                                                     │
│  EVENTS CONSUMED:                                                   │
│  └── user.created (creates patient profile for new users)           │
└─────────────────────────────────────────────────────────────────────┘