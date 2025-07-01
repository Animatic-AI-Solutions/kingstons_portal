---
title: "Architecture Diagrams"
tags: ["architecture", "diagrams", "mermaid", "visuals"]
related_docs:
  - "./01_system_architecture_overview.md"
  - "./03_database_schema.md"
  - "./04_api_design.md"
---
# Kingston's Portal - System Architecture Diagrams

This document contains a series of [Mermaid](https://mermaid.js.org/) diagrams that visualize the system architecture, database relationships, and data flows. For a narrative explanation of these diagrams, please refer to the [System Architecture Overview](./01_system_architecture_overview.md).

## System Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React + TypeScript<br/>35+ Pages, 30+ Components]
        Router[React Router<br/>Protected Routes]
    end
    
    subgraph "API Layer"
        API[FastAPI Backend<br/>25+ Route Modules]
        Auth[JWT Authentication]
        CORS[CORS Middleware]
    end
    
    subgraph "Database Layer"
        DB[(PostgreSQL<br/>5-Level Hierarchy)]
        Views[Optimized Views<br/>Performance Aggregations]
    end
    
    UI --> Router
    Router --> API
    API --> Auth
    API --> CORS
    API --> DB
    DB --> Views
```

## Database Entity Relationships

This diagram shows the primary relationships between the core entities. For a full breakdown of tables and columns, see the [Database Schema](./03_database_schema.md) document.

```mermaid
erDiagram
    CLIENT_GROUPS {
        bigint id PK
        text name
        text advisor
        text status
    }
    
    PRODUCT_OWNERS {
        bigint id PK
        text firstname
        text surname
        text known_as
    }
    
    CLIENT_PRODUCTS {
        bigint id PK
        bigint client_id FK
        text product_name
        bigint provider_id FK
        bigint portfolio_id FK
    }
    
    PORTFOLIOS {
        bigint id PK
        text portfolio_name
        bigint template_generation_id FK
    }
    
    PORTFOLIO_FUNDS {
        bigint id PK
        bigint portfolio_id FK
        bigint available_funds_id FK
        numeric target_weighting
    }
    
    AVAILABLE_FUNDS {
        bigint id PK
        varchar fund_name
        text isin_number
        smallint risk_factor
    }
    
    CLIENT_GROUPS ||--o{ CLIENT_PRODUCTS : has
    CLIENT_PRODUCTS ||--o{ PORTFOLIOS : contains
    PORTFOLIOS ||--o{ PORTFOLIO_FUNDS : holds
    AVAILABLE_FUNDS ||--o{ PORTFOLIO_FUNDS : allocated
    PRODUCT_OWNERS ||--o{ CLIENT_PRODUCTS : owns
```

## Application Data Flow

This diagram illustrates how data flows from the UI components, through the API layer, to the database.

```mermaid
flowchart TD
    Dashboard[Dashboard<br/>Executive Overview]
    Clients[Client Management<br/>7 Pages]
    Products[Product Management<br/>12 Pages]
    Analytics[Analytics & Reporting<br/>8 Pages]
    
    ClientAPI[Client API<br/>25+ Endpoints]
    ProductAPI[Product API<br/>20+ Endpoints]
    AnalyticsAPI[Analytics API<br/>10+ Endpoints]
    
    CoreDB[(Core Data<br/>Clients, Products)]
    PerformanceDB[(Performance Data<br/>Valuations, IRR)]
    
    Dashboard --> ClientAPI
    Dashboard --> AnalyticsAPI
    Clients --> ClientAPI
    Products --> ProductAPI
    Analytics --> AnalyticsAPI
    
    ClientAPI --> CoreDB
    ProductAPI --> CoreDB
    AnalyticsAPI --> PerformanceDB
```

## Component Architecture

This diagram shows the relationship between the major parts of the frontend architecture. See the [State Management](./../5_frontend_guide/02_state_management.md) guide for more details.

```mermaid
graph TB
    subgraph "Page Components"
        ClientPages[Client Management<br/>7 Pages]
        ProductPages[Product Management<br/>12 Pages]
        ReportPages[Analytics & Reporting<br/>8 Pages]
    end
    
    subgraph "UI Components"
        DataComponents[Data Display<br/>Tables, Charts, Stats]
        FormComponents[Form Controls<br/>Inputs, Dropdowns]
        ActionComponents[Actions<br/>Buttons, Controls]
    end
    
    subgraph "Services & State"
        APIServices[API Communication]
        AuthServices[Authentication]
        StateManagement[React Query Cache]
    end
    
    ClientPages --> DataComponents
    ProductPages --> FormComponents
    ReportPages --> ActionComponents
    
    DataComponents --> APIServices
    FormComponents --> AuthServices
    ActionComponents --> StateManagement
```

## Security Architecture

```mermaid
graph TB
    subgraph "Client Security"
        HTTPS[HTTPS/TLS 1.3<br/>Encrypted Communication]
        CSP[Content Security Policy<br/>XSS Protection]
        CORS[CORS Headers<br/>Origin Validation]
    end
    
    subgraph "Authentication Layer"
        JWT[JWT Tokens<br/>Stateless Auth]
        Session[Database Sessions<br/>Session Tracking]
        Password[Password Hashing<br/>Secure Storage]
    end
    
    subgraph "API Security"
        Validation[Input Validation<br/>Pydantic Models]
        Sanitization[Data Sanitization<br/>SQL Injection Prevention]
        Logging[Security Logging<br/>Audit Trail]
    end
    
    subgraph "Database Security"
        Encryption[Data Encryption<br/>At Rest & Transit]
        Access[Role-Based Access<br/>Principle of Least Privilege]
        Backup[Encrypted Backups<br/>Point-in-time Recovery]
        Audit[Audit Logging<br/>Change Tracking]
    end
    
    HTTPS --> JWT
    CSP --> Validation
    CORS --> Validation
    JWT --> Session
    Session --> Password
    Validation --> Sanitization
    Sanitization --> Logging
    Logging --> Encryption
    Encryption --> Access
    Access --> Backup
    
    style HTTPS fill:#ffebee
    style JWT fill:#f3e5f5
    style Validation fill:#e8f5e8
    style Encryption fill:#fff3e0
```

## Performance Optimization Architecture

```mermaid
graph TB
    subgraph "Frontend Optimization"
        CodeSplit[Code Splitting<br/>Route-based Loading]
        LazyLoad[Lazy Loading<br/>Component Loading]
        Bundle[Bundle Optimization<br/>Tree Shaking]
        Cache[Browser Caching<br/>Static Assets]
    end
    
    subgraph "API Optimization"
        BulkAPI[Bulk API Endpoints<br/>Single-query Data]
        Pagination[Pagination<br/>Efficient Data Loading]
        Compression[Response Compression<br/>Gzip/Brotli]
        CDN[CDN Distribution<br/>Static Asset Delivery]
    end
    
    subgraph "Database Optimization"
        Indexes[50+ Indexes<br/>Query Optimization]
        Views[Optimized Views<br/>Pre-computed Aggregations]
        ConnectionPool[Connection Pooling<br/>Resource Management]
    end
    
    subgraph "Caching Strategy"
        ReactQuery[React Query<br/>5-minute Cache]
        DBCache[Database Cache<br/>Query Result Cache]
        StaticCache[Static Cache<br/>Asset Caching]
        APICache[API Response Cache<br/>Conditional Requests]
    end
    
    CodeSplit --> BulkAPI
    LazyLoad --> Pagination
    Bundle --> Compression
    Cache --> CDN
    
    BulkAPI --> Indexes
    Pagination --> Views
    Compression --> ConnectionPool
    
    Indexes --> ReactQuery
    Views --> DBCache
    Cache --> StaticCache
    ConnectionPool --> APICache
    
    style CodeSplit fill:#e8f5e8
    style BulkAPI fill:#fff3e0
    style Indexes fill:#f3e5f5
    style ReactQuery fill:#e3f2fd
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development Environment"
        DevFE[React Dev Server<br/>Vite HMR]
        DevBE[FastAPI Dev Server<br/>Auto-reload]
        DevDB[Local PostgreSQL<br/>Development Data]
    end
    
    subgraph "Production Environment"
        ProdFE[Static Assets<br/>Nginx/CDN]
        ProdBE[FastAPI + Uvicorn<br/>Docker Container]
        ProdDB[PostgreSQL<br/>Production Database]
        LoadBalancer[Load Balancer<br/>High Availability]
    end
    
    subgraph "Infrastructure"
        Docker[Docker Containers<br/>Containerization]
        Monitoring[Monitoring<br/>Logs & Metrics]
        Backup[Backup System<br/>Automated Backups]
        SSL[SSL/TLS<br/>Security Certificates]
    end
    
    DevFE --> ProdFE
    DevBE --> ProdBE
    DevDB --> ProdDB
    
    ProdFE --> LoadBalancer
    ProdBE --> LoadBalancer
    LoadBalancer --> ProdDB
    
    ProdFE --> Docker
    ProdBE --> Docker
    ProdDB --> Monitoring
    Monitoring --> Backup
    Backup --> SSL
    
    style DevFE fill:#e8f5e8
    style ProdFE fill:#fff3e0
    style Docker fill:#e3f2fd
```

## Integration Points

```mermaid
graph LR
    subgraph "Internal System"
        Core[Kingston's Portal<br/>Core System]
        DB[(Database<br/>PostgreSQL)]
        API[REST API<br/>FastAPI]
    end
    
    subgraph "External Integrations"
        Providers[Investment Providers<br/>Data Feeds]
        Reporting[Report Systems<br/>PDF/Excel Generation]
        Email[Email Services<br/>Notifications]
        Backup[Backup Services<br/>Cloud Storage]
    end
    
    subgraph "Future Integrations"
        Mobile[Mobile Apps<br/>Native iOS/Android]
        ML[ML Services<br/>Performance Prediction]
        ThirdParty[Third-party APIs<br/>Market Data]
        Compliance[Compliance Systems<br/>Regulatory Reporting]
    end
    
    Core --> DB
    Core --> API
    API --> Providers
    API --> Reporting
    API --> Email
    DB --> Backup
    
    Core -.-> Mobile
    API -.-> ML
    API -.-> ThirdParty
    API -.-> Compliance
    
    style Core fill:#e3f2fd
    style Providers fill:#fff3e0
    style Mobile fill:#f1f8e9
``` 