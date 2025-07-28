---
title: "Security Considerations"
tags: ["advanced", "security", "authentication", "jwt", "xss"]
related_docs:
  - "./02_performance_optimizations.md"
  - "./03_deployment_process.md"
  - "../3_architecture/04_api_design.md"
---
# Security Considerations

Security is a critical aspect of the Kingston's Portal application, especially given the sensitive financial data it handles. This document outlines the key security measures implemented across the technology stack.

## 1. Authentication & Authorization

- **Authentication:** We use a **secure httpOnly cookie-based JWT authentication** system for maximum security.
  1.  On successful login, the FastAPI backend generates a signed JSON Web Token (JWT).
  2.  This token is set as an **httpOnly cookie** (`access_token`), making it inaccessible to JavaScript and protecting against XSS attacks.
  3.  The frontend automatically includes this cookie in all API requests via browser cookie handling.
  4.  **Dual Authentication Support:** The system supports both cookie-based authentication (primary) and Authorization header authentication (fallback for API clients).
  5.  **Session Management:** A separate `session_id` cookie provides additional session tracking and management capabilities.
- **Authorization:**
  - The backend uses a `get_current_user` dependency that is injected into all protected routes, as described in the [API Design](../3_architecture/04_api_design.md) guide.
  - This dependency prioritizes httpOnly cookie authentication, then falls back to Authorization headers, then session cookies.
  - The dependency decodes the JWT, verifies its signature and expiration, and retrieves the user's profile.
- **Password Security:** User passwords are never stored in plain text. We use the `passlib` library to hash and salt passwords with a strong, modern algorithm (bcrypt).
- **XSS Protection:** JWT tokens are stored in httpOnly cookies that cannot be accessed by JavaScript, providing strong protection against Cross-Site Scripting attacks.

## 2. Data Protection

- **Input Validation (Backend):** All incoming data to the API is strictly validated using **Pydantic models**. This prevents data type mismatches and mitigates risks like data corruption attacks.
- **SQL Injection Prevention:** The backend data access layer uses parameterized queries, which treat user-provided input as data, not as executable SQL code, thus preventing SQL injection vulnerabilities.
- **Cross-Site Scripting (XSS) Prevention:**
  - **React:** React automatically escapes content rendered within JSX, preventing strings from being interpreted as HTML.
  - **httpOnly Cookies:** Authentication tokens are stored in httpOnly cookies that cannot be accessed by malicious JavaScript, providing strong protection against token theft via XSS attacks.
  - **Automatic Cookie Handling:** The browser automatically manages authentication cookies, eliminating the need for JavaScript token storage and reducing XSS attack surface.
- **Environment Variable Management:** All secrets and credentials are stored in a `.env` file, which is **explicitly ignored by Git** and should never be committed to the repository. See the [Setup and Installation](../2_getting_started/01_setup_and_installation.md) guide for more details.

## 3. Communication Security

- **HTTPS/TLS:** In a production environment, the application must be deployed behind a reverse proxy (like Nginx) that enforces HTTPS, encrypting all traffic between the client and the server.
- **CORS (Cross-Origin Resource Sharing):** The FastAPI backend is configured with a strict CORS policy that only allows requests from the specific origin of the frontend application. The CORS configuration includes `allow_credentials=True` to support secure httpOnly cookie transmission between frontend and backend.

## 4. Auditing and Logging

- **`holding_activity_log`:** This database table provides a comprehensive and immutable audit trail for all financial transactions, which is critical for compliance.
- **`provider_switch_log`:** This table tracks all changes to a product's provider, maintaining a clear history.
- **Application Logging:** The backend logs important events, errors, and security-related incidents, which can be forwarded to a centralized logging system for monitoring. 