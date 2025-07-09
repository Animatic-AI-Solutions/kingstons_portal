---
title: "Architecture Diagrams"
tags: ["architecture", "diagrams", "system_design"]
related_docs:
  - "./01_system_architecture_overview.md"
  - "../6_advanced/03_deployment_process.md"
---

# Architecture Diagrams

This document provides visual representations of the system architecture for both development and production environments.

## Production Architecture - Kingston03 Server

### Overall System Architecture
```mermaid
graph TB
    subgraph "Client Network"
        CLIENT[Client Browser]
        DNS[DNS Resolution<br/>intranet.kingston.local]
    end
    
    subgraph "Kingston03 Server (192.168.0.223)"
        subgraph "Port 80 - IIS"
            IIS[IIS Web Server<br/>Static Files]
            REACT[React App<br/>Built Assets]
            WEBC[web.config<br/>URL Rewrite]
        end
        
        subgraph "Port 8001 - FastAPI Service"
            FASTAPI[FastAPI Backend<br/>NSSM Service]
            AUTH[Authentication]
            APIEND[API Endpoints]
        end
        
        subgraph "System Services"
            DNSSERV[DNS Server<br/>kingston.local]
            FIREWALL[Windows Firewall<br/>Port 8001 Rule]
            NSSM[NSSM Service Manager]
        end
    end
    
    subgraph "External Services"
        SUPABASE[(Supabase<br/>PostgreSQL)]
    end
    
    CLIENT --> DNS
    DNS --> IIS
    CLIENT --> |"Direct API Calls<br/>:8001/api/*"| FASTAPI
    IIS --> REACT
    REACT --> WEBC
    FASTAPI --> AUTH
    FASTAPI --> APIEND
    FASTAPI --> SUPABASE
    NSSM --> FASTAPI
    FIREWALL --> FASTAPI
    DNSSERV --> DNS
    
    style IIS fill:#e1f5fe
    style FASTAPI fill:#f3e5f5
    style SUPABASE fill:#e8f5e8
    style DNSSERV fill:#fff3e0
```

### Environment-Based API Communication
```mermaid
graph TB
    subgraph "Development Environment"
        DEVBROWSER[Browser<br/>localhost:3000]
        VITE[Vite Dev Server<br/>:3000]
        PROXY[Vite Proxy<br/>API Calls]
        DEVAPI[FastAPI Dev<br/>:8001]
    end
    
    subgraph "Production Environment"
        PRODBROWSER[Browser<br/>intranet.kingston.local]
        PRODII[IIS Server<br/>:80]
        PRODAPI[FastAPI Service<br/>:8001]
    end
    
    subgraph "API Configuration Logic"
        ENVDETECT[Environment Detection<br/>getApiBaseUrl()]
        DEVCONFIG[Development:<br/>baseURL = '']
        PRODCONFIG[Production:<br/>baseURL = 'http://intranet.kingston.local:8001']
    end
    
    DEVBROWSER --> VITE
    VITE --> PROXY
    PROXY --> DEVAPI
    
    PRODBROWSER --> PRODII
    PRODBROWSER --> |"Direct API Calls"| PRODAPI
    
    ENVDETECT --> DEVCONFIG
    ENVDETECT --> PRODCONFIG
    
    style DEVBROWSER fill:#e3f2fd
    style PRODBROWSER fill:#f1f8e9
    style ENVDETECT fill:#fff3e0
```

## Development Architecture

### Local Development Setup
```mermaid
graph TB
    subgraph "Developer Machine"
        subgraph "Terminal 1 - Backend"
            BACKEND[FastAPI Backend<br/>uvicorn main:app<br/>--port 8001]
            HOTRELOAD[Hot Reload<br/>--reload flag]
        end
        
        subgraph "Terminal 2 - Frontend"
            FRONTEND[Vite Dev Server<br/>npm start<br/>:3000]
            HMR[Hot Module Replacement<br/>React Components]
        end
        
        subgraph "Browser"
            DEVAPP[Development App<br/>localhost:3000]
            DEVTOOLS[Browser DevTools<br/>Network Debugging]
        end
    end
    
    subgraph "External Services"
        SUPABASE[(Supabase<br/>PostgreSQL)]
    end
    
    FRONTEND --> DEVAPP
    DEVAPP --> |"API Proxy<br/>/api/* → :8001"| BACKEND
    BACKEND --> SUPABASE
    HOTRELOAD --> BACKEND
    HMR --> FRONTEND
    DEVTOOLS --> DEVAPP
    
    style BACKEND fill:#f3e5f5
    style FRONTEND fill:#e1f5fe
    style SUPABASE fill:#e8f5e8
```

## Data Flow Diagrams

### Authentication Flow
```mermaid
sequenceDiagram
    participant Client as Client Browser
    participant IIS as IIS (Port 80)
    participant FastAPI as FastAPI (Port 8001)
    participant Supabase as Supabase DB
    
    Client->>IIS: GET /login (React App)
    IIS->>Client: Return login page
    Client->>FastAPI: POST /api/auth/login
    FastAPI->>Supabase: Validate credentials
    Supabase->>FastAPI: Return user data
    FastAPI->>Client: Return JWT token
    Client->>FastAPI: GET /api/auth/me (with token)
    FastAPI->>Client: Return user profile
```

### API Request Flow
```mermaid
sequenceDiagram
    participant Client as Client Browser
    participant Env as Environment Detection
    participant IIS as IIS (Port 80)
    participant FastAPI as FastAPI (Port 8001)
    participant Supabase as Supabase DB
    
    Client->>Env: getApiBaseUrl()
    Env->>Client: Return base URL
    Note over Client,Env: Development: ''<br/>Production: 'http://intranet.kingston.local:8001'
    Client->>FastAPI: API Request to baseURL/api/endpoint
    FastAPI->>Supabase: Database Query
    Supabase->>FastAPI: Return data
    FastAPI->>Client: Return JSON response
    
    Note over Client,FastAPI: Direct API calls bypass IIS<br/>for optimal performance
```

## CORS Configuration Diagram

```mermaid
graph TB
    subgraph "FastAPI CORS Configuration"
        CORSM[CORS Middleware]
        ORIGINS[allow_origins:<br/>- http://intranet.kingston.local<br/>- http://localhost:3000<br/>- http://127.0.0.1:3000]
        CREDENTIALS[allow_credentials: True]
        METHODS[allow_methods:<br/>GET, POST, PUT, DELETE, OPTIONS, PATCH]
        HEADERS[allow_headers: ["*"]]
    end
    
    subgraph "Request Sources"
        PROD[Production Frontend<br/>intranet.kingston.local]
        DEV[Development Frontend<br/>localhost:3000]
        DEV2[Development Frontend<br/>127.0.0.1:3000]
    end
    
    PROD --> CORSM
    DEV --> CORSM
    DEV2 --> CORSM
    
    CORSM --> ORIGINS
    CORSM --> CREDENTIALS
    CORSM --> METHODS
    CORSM --> HEADERS
    
    style CORSM fill:#fff3e0
    style ORIGINS fill:#e8f5e8
    style CREDENTIALS fill:#fce4ec
    style METHODS fill:#e3f2fd
    style HEADERS fill:#f1f8e9
```

## Network Architecture

### Kingston03 Server Network Configuration
```mermaid
graph TB
    subgraph "Network Infrastructure"
        ROUTER[Network Router<br/>192.168.0.1]
        SWITCH[Network Switch]
    end
    
    subgraph "Kingston03 Server (192.168.0.223)"
        NIC[Network Interface Card]
        DNS[DNS Server<br/>kingston.local zone]
        FIREWALL[Windows Firewall<br/>Port 8001 Rule]
        
        subgraph "Services"
            IIS[IIS Web Server<br/>Port 80]
            FASTAPI[FastAPI Service<br/>Port 8001]
        end
    end
    
    subgraph "Client Machines"
        CLIENT1[Client PC 1<br/>DNS: 192.168.0.223]
        CLIENT2[Client PC 2<br/>DNS: 192.168.0.223]
        CLIENT3[Client PC 3<br/>DNS: 192.168.0.223]
    end
    
    ROUTER --> SWITCH
    SWITCH --> NIC
    NIC --> DNS
    NIC --> FIREWALL
    FIREWALL --> IIS
    FIREWALL --> FASTAPI
    
    SWITCH --> CLIENT1
    SWITCH --> CLIENT2
    SWITCH --> CLIENT3
    
    CLIENT1 --> |"DNS Query<br/>intranet.kingston.local"| DNS
    CLIENT2 --> |"DNS Query<br/>intranet.kingston.local"| DNS
    CLIENT3 --> |"DNS Query<br/>intranet.kingston.local"| DNS
    
    style DNS fill:#fff3e0
    style FIREWALL fill:#ffebee
    style IIS fill:#e1f5fe
    style FASTAPI fill:#f3e5f5
```

## Key Architectural Benefits

### 1. **Performance Optimization**
- **IIS**: Optimized for static file serving with caching
- **FastAPI**: Direct API communication eliminates proxy overhead
- **Separation of Concerns**: Clear boundaries between frontend and backend

### 2. **Scalability**
- **Horizontal Scaling**: Services can be scaled independently
- **Load Balancing**: Future load balancers can be added easily
- **Microservices Ready**: Architecture supports future service decomposition

### 3. **Security**
- **Firewall Protection**: Port-specific access control
- **CORS Configuration**: Explicit origin whitelisting
- **Service Isolation**: Frontend and backend run in separate contexts

### 4. **Maintainability**
- **Environment Detection**: Automatic configuration switching
- **Service Management**: NSSM provides reliable service management
- **Debugging**: Clear separation makes troubleshooting easier

This architecture provides a robust, scalable foundation for the Kingston's Portal application while maintaining simplicity and performance. 