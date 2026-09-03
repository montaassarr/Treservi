# Reservi - System Architecture

<div align="center">

![Reservi Architecture](https://img.shields.io/badge/Architecture-Enterprise--Grade-blue?style=for-the-badge)
![Multi-Tenant](https://img.shields.io/badge/Multi--Tenant-Supported-green?style=for-the-badge)
![Cloud Native](https://img.shields.io/badge/Cloud-Native-orange?style=for-the-badge)

**A high-performance, multi-tenant SaaS architecture designed for scalable salon and barbershop management.**

</div>

---

## 🏗️ High-Level System Architecture

Reservi is built on a decoupled, microservices-inspired architecture that separates the presentation layer from the core business logic. It leverages cloud-native principles, real-time communication, and AI capabilities for a seamless user experience.

```mermaid
graph TB
    subgraph "Client Layer"
        A[Web Application<br/>React 19 + Vite]
        B[PWA Service Worker<br/>Offline Support]
    end
    
    subgraph "API Gateway & Services"
        C[Node.js Backend<br/>Express + TypeScript]
    end
    
    subgraph "External AI Services"
        D[Google GenAI<br/>Gemini 3 Pro Preview]
    end
    
    subgraph "Data Layer"
        E[(MongoDB Atlas<br/>Multi-Tenant Database)]
    end
    
    subgraph "Notification Services"
        F[Web Push Service<br/>Real-time Alerts]
    end
    
    A -->|REST API / JWT| C
    B -->|Cache & Sync| A
    A -->|AI Analysis & Queries| D
    C -->|Mongoose ODM| E
    C -->|Push Payload| F
    F -->|Notifications| A
    
    style C fill:#4CAF50,color:#fff
    style D fill:#2196F3,color:#fff
    style E fill:#4db33d,color:#fff
```

## 🔄 Core Request Flow

The following sequence illustrates the reservation process and real-time state propagation across the system.

```mermaid
sequenceDiagram
    participant C as Client (Customer)
    participant F as Frontend App
    participant AI as Gemini Assistant
    participant B as Backend API
    participant DB as MongoDB Atlas
    participant P as Push Service
    
    C->>F: Uploads hairstyle image
    F->>AI: analyzeImage(base64Image)
    AI-->>F: Style recommendations & viability
    
    C->>F: Selects slot & confirms booking
    F->>B: POST /api/appointments
    B->>B: Verify JWT & Tenant context
    
    B->>DB: Check availability & Insert
    DB-->>B: Success Confirmation
    
    B->>DB: Query Staff Push Subscriptions
    DB-->>B: Subscription Tokens
    
    B->>P: Dispatch Web Push Payload
    P-->>F: Trigger Service Worker Notification
    
    B-->>F: HTTP 201 Created
    F-->>C: Display Success UI
```

## 💾 Data Model (Multi-Tenant)

The database schema enforces tenant isolation at the document level. Every operational entity references a root `Salon` (Tenant) to guarantee logical separation and secure access control.

```mermaid
erDiagram
    SALON ||--o{ USER : "employs / manages"
    SALON ||--o{ SERVICE : "offers"
    SALON ||--o{ APPOINTMENT : "hosts"
    USER ||--o{ APPOINTMENT : "assigned to"
    USER ||--o{ PUSH_SUBSCRIPTION : "registers"
    
    SALON {
        ObjectId id PK
        string name
        string domain "Custom Tenant URL"
        object settings
    }
    
    USER {
        ObjectId id PK
        ObjectId salonId FK
        string name
        string email
        string role "SUPER_ADMIN, OWNER, STAFF"
        string passwordHash
    }
    
    SERVICE {
        ObjectId id PK
        ObjectId salonId FK
        string name
        number price
        number duration_minutes
    }
    
    APPOINTMENT {
        ObjectId id PK
        ObjectId salonId FK
        ObjectId staffId FK
        ObjectId serviceId FK
        string clientName
        datetime startTime
        string status "PENDING, CONFIRMED, COMPLETED"
    }
    
    PUSH_SUBSCRIPTION {
        ObjectId id PK
        ObjectId userId FK
        string endpoint
        object keys
    }
```

## 🧩 Component Breakdown

```mermaid
graph LR
    subgraph "Frontend Architecture"
        UI[UI Components<br/>Tailwind + Framer Motion]
        SM[State Management<br/>React Hooks]
        AI[AI Service Integration<br/>Gemini Client]
        SW[Service Worker<br/>Offline Capabilities]
    end
    
    subgraph "Backend Services"
        AUTH[Auth Middleware<br/>JWT + Rate Limit]
        TENANT[Tenant Resolver<br/>Isolation Context]
        CTRL[Domain Controllers<br/>Appointments, Staff]
        ODM[Data Access Layer<br/>Mongoose Models]
    end
    
    UI --> SM
    UI --> AI
    SM --> AUTH
    AUTH --> TENANT
    TENANT --> CTRL
    CTRL --> ODM
    
    style UI fill:#61dafb,color:#000
    style AUTH fill:#8bc34a,color:#000
    style TENANT fill:#ff9800,color:#fff
```

## 🛠️ Technology Stack & Infrastructure

### Presentation Layer
* **React 19 & TypeScript**: Strong typing and concurrent rendering for a robust user interface.
* **Vite**: Ultra-fast build tooling and hot module replacement (HMR).
* **Tailwind CSS & Framer Motion**: Utility-first styling combined with fluid physics-based animations.
* **Google GenAI Integration**: Direct client-to-cloud AI interactions for image analysis and business strategy querying.

### Application Layer
* **Node.js & Express**: High-throughput, non-blocking asynchronous request handling.
* **JWT & bcryptjs**: Stateless authentication and secure password hashing.
* **Web Push API**: Native browser notifications for real-time staff alerts.
* **Helmet & Express Rate Limit**: Production-grade security middleware.

### Persistence Layer
* **MongoDB Atlas**: Fully managed cloud NoSQL database optimized for document-based tenant structures.
* **Mongoose**: Schema validation and object data modeling mapping.

## 🌐 Deployment Architecture

Reservi's deployment pipeline is optimized for edge-delivery and highly-available containerized microservices.

```mermaid
graph TB
    subgraph "Global CDN / Edge"
        V[Vercel Edge Network<br/>Static Assets & Routing]
    end
    
    subgraph "Application Hosting (Dockerized)"
        B1[Backend Instance 1<br/>Node.js]
        B2[Backend Instance N<br/>Node.js]
    end
    
    subgraph "Database Cluster"
        M1[(MongoDB Primary<br/>Atlas)]
        M2[(MongoDB Replica<br/>Atlas)]
    end
    
    subgraph "CI/CD Pipeline"
        GA[GitHub Actions<br/>Test & Build]
    end
    
    GA -.->|Deploy Frontend| V
    GA -.->|Deploy Backend| B1
    
    V -->|HTTPS REST| B1
    V -->|HTTPS REST| B2
    
    B1 -->|TCP/TLS| M1
    B2 -->|TCP/TLS| M1
    M1 -.->|Oplog Sync| M2
    
    style V fill:#000000,color:#fff
    style B1 fill:#232F3E,color:#fff
    style B2 fill:#232F3E,color:#fff
    style M1 fill:#00ED64,color:#000
```
