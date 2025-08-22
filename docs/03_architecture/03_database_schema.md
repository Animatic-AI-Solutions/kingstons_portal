---
title: "Database Schema"
tags: ["database", "schema", "architecture", "postgresql", "views", "erd"]
related_docs:
  - "./01_system_architecture_overview.md"
  - "./02_architecture_diagrams.md"
  - "./04_api_design.md"
---
# Database Schema

This document provides a detailed breakdown of the PostgreSQL database architecture. The definitive source of truth for the schema, including all tables, views, functions, and constraints, is the `database.sql` file located in the project root. This document serves as a guide to that file, explaining the core tables, their relationships, and the performance-oriented views used by the application.

## 1. Entity-Relationship Diagram (ERD)

The following diagram illustrates the relationships between the primary tables in the database.

```mermaid
erDiagram
    profiles {
        bigint id PK
        timestamptz created_at
        text first_name
        text last_name
        text email
        text profile_picture_url
    }

    authentication {
        bigint auth_id PK
        timestamptz created_at
        text password_hash
        bigint profiles_id FK
    }

    session {
        text session_id PK
        bigint profiles_id FK
        timestamptz expires_at
    }

    client_groups {
        bigint id PK
        text name
        text type
        text status
    }

    product_owners {
        bigint id PK
        text firstname
        text surname
        text known_as
        text status
    }

    client_group_product_owners {
        bigint id PK
        bigint client_group_id FK
        bigint product_owner_id FK
    }

    available_providers {
        bigint id PK
        text name
        text status
        text theme_color
    }

    available_portfolios {
        bigint id PK
        text name
    }

    template_portfolio_generations {
        bigint id PK
        bigint available_portfolio_id FK
        int version_number
        text generation_name
        text status
    }

    available_portfolio_funds {
        bigint id PK
        bigint template_portfolio_generation_id FK
        bigint fund_id FK
        numeric target_weighting
    }

    available_funds {
        bigint id PK
        varchar(60) fund_name
        text isin_number
        smallint risk_factor
        numeric fund_cost
        text status
    }

    portfolios {
        bigint id PK
        text portfolio_name
        text status
        date start_date
        bigint template_generation_id FK
    }

    client_products {
        bigint id PK
        bigint client_id FK
        text product_name
        text status
        bigint provider_id FK
        bigint portfolio_id FK
    }

    product_owner_products {
        bigint id PK
        bigint product_owner_id FK
        bigint product_id FK
    }

    portfolio_funds {
        bigint id PK
        bigint portfolio_id FK
        bigint available_funds_id FK
        numeric amount_invested
        numeric target_weighting
    }

    portfolio_fund_valuations {
        bigint id PK
        bigint portfolio_fund_id FK
        date valuation_date
        numeric valuation
    }

    portfolio_valuations {
        bigint id PK
        bigint portfolio_id FK
        date valuation_date
        numeric valuation
    }

    holding_activity_log {
        bigint id PK
        bigint product_id FK
        bigint portfolio_fund_id FK
        text activity_type
        numeric amount
        timestamptz activity_timestamp
    }

    provider_switch_log {
        bigint id PK
        bigint client_product_id FK
        bigint previous_provider_id FK
        bigint new_provider_id FK
        timestamptz switch_date
    }

    portfolio_irr_values {
        bigint id PK
        bigint portfolio_id FK
        date date
        numeric irr_result
    }

    portfolio_fund_irr_values {
        bigint id PK
        bigint fund_id FK
        date date
        numeric irr_result
    }

    profiles ||--o{ authentication : "has one"
    profiles ||--o{ session : "has many"
    client_groups ||--o{ client_group_product_owners : "links to"
    product_owners ||--o{ client_group_product_owners : "links to"
    client_groups ||--o{ client_products : "has many"
    available_providers ||--o{ client_products : "provides"
    portfolios ||--o{ client_products : "assigned to"
    client_products ||--o{ product_owner_products : "owned by"
    product_owners ||--o{ product_owner_products : "owns"
    client_products ||--o{ holding_activity_log : "has"
    client_products ||--o{ provider_switch_log : "logs switches for"
    available_portfolios ||--o{ template_portfolio_generations : "has versions"
    template_portfolio_generations ||--o{ available_portfolio_funds : "defines funds for"
    template_portfolio_generations ||--o{ portfolios : "instantiates"
    available_funds ||--o{ available_portfolio_funds : "is in"
    portfolios ||--o{ portfolio_funds : "contains"
    available_funds ||--o{ portfolio_funds : "is in"
    portfolio_funds ||--o{ portfolio_fund_valuations : "has valuations"
    portfolio_funds ||--o{ holding_activity_log : "has activity"
    portfolio_funds ||--o{ portfolio_fund_irr_values : "has IRR for"
    portfolios ||--o{ portfolio_valuations : "has valuations"
    portfolios ||--o{ portfolio_irr_values : "has IRR"
}
```

## 2. Core Tables & Entities

These tables represent the foundational entities of the system.

-   **`profiles`**: Stores user data for application administrators and advisors.
-   **`authentication`**: Manages user credentials, linked directly to `profiles`.
-   **`session`**: Stores active user login sessions.
-   **`client_groups`**: The central table for client entities. A group can represent a family, an individual, or a trust.
-   **`product_owners`**: Represents individuals who are owners or beneficiaries of financial products.
-   **`available_providers`**: A catalog of all investment providers (e.g., Zurich, Aviva).
-   **`available_funds`**: A master list of all investment funds that can be held in a portfolio.
-   **`available_portfolios`**: A list of master portfolio templates (e.g., "Conservative Growth").

## 3. Portfolio & Product Management

This set of tables defines the structure of portfolios and client products.

-   **`template_portfolio_generations`**: Stores versioned instances of `available_portfolios`. This is a critical feature, allowing portfolio templates to evolve without altering historical client portfolio structures.
-   **`available_portfolio_funds`**: A junction table defining the target funds and weightings for a specific `template_portfolio_generation`.
-   **`portfolios`**: Represents an actual portfolio instance. It is typically instantiated from a `template_portfolio_generation` and is the core of a client's holdings.
-   **`client_products`**: A central table representing a financial product or account held by a `client_group`. It links the client to a `provider` and a `portfolio`.
-   **`portfolio_funds`**: Represents a specific fund holding within an actual client `portfolio`, including the amount invested and its weighting.

## 4. Junction Tables (Many-to-Many Relationships)

These tables create many-to-many links between core entities.

-   **`client_group_product_owners`**: Links `product_owners` to `client_groups`, allowing multiple people to be part of a single client entity.
-   **`product_owner_products`**: Links `product_owners` to the `client_products` they own, enabling shared ownership of a financial product.

## 5. Financial & Transactional Data

These tables store the time-series financial data, valuations, and activity logs that are essential for reporting and analytics.

-   **`holding_activity_log`**: A detailed audit trail of all transactions (e.g., `Investment`, `Withdrawal`, `FundSwitchIn`) for each `portfolio_fund`. This is the source for IRR calculations.
-   **`portfolio_fund_valuations`**: Records the market value of a specific fund within a portfolio at various points in time.
-   **`portfolio_valuations`**: Stores the total aggregated valuation of a client's `portfolio` over time.
-   **`portfolio_irr_values`**: Stores the calculated Internal Rate of Return (IRR) for a `portfolio`.
-   **`portfolio_fund_irr_values`**: Stores the calculated IRR for individual `portfolio_funds`.
-   **`provider_switch_log`**: Logs any changes in the provider for a `client_product`.

## 6. Performance Optimization Views

To enhance application performance, the database leverages numerous pre-aggregated views. These views perform complex joins and calculations at the database level, providing the API with clean, ready-to-use data sets and significantly speeding up dashboard and report loading.

Key views include:

-   **`advisor_client_summary`**: Provides a summary of advisors with their client group counts and total product counts for dropdown selection and advisor management.
-   **`client_group_complete_data`**: A wide, aggregated view that powers the main client dashboard, containing all products, total valuations, and calculated revenue for a client group.
-   **`company_revenue_analytics`**: Pre-calculates revenue metrics across the entire business for analytics dashboards.
-   **`complete_fund_data`**: A comprehensive view joining funds with their latest market value, IRR, and activity summary.
-   **`latest_portfolio_fund_valuations`**: Provides only the most recent valuation for each fund in a portfolio.
-   **`latest_portfolio_irr_values`**: Provides the most recently calculated IRR for each portfolio.
-   **`products_list_view`**: A detailed view for displaying all client products with associated owner and portfolio information.
-   **`provider_revenue_breakdown`**: A summary view that calculates the total revenue generated per provider across all client products.
-   **`template_generation_weighted_risk`**: Calculates the overall weighted risk factor for a portfolio template based on the funds it contains.

## 7. Ultra-Fast Analytics Views

To address critical performance issues with the analytics dashboard (reducing load times from 67+ seconds to sub-second response), specialized analytics views have been implemented:

-   **`company_irr_cache`**: Stores pre-computed company-wide IRR calculations with cache timestamps and 24-hour validity periods. Eliminates the need for real-time IRR computation on every dashboard load.
    
-   **`analytics_dashboard_summary`**: Aggregates key business metrics including total funds under management (FUM), company IRR, total clients, total accounts, and total funds managed. Provides instant access to critical dashboard KPIs.
    
-   **`fund_distribution_fast`**: Pre-computed view showing fund allocation across the business, including fund names, total holdings, and percentage distributions. Powers analytics charts without real-time aggregation.
    
-   **`provider_distribution_fast`**: Pre-computed provider allocation analytics showing provider names, total holdings, and distribution percentages. Enables instant provider analysis dashboards.

These analytics views are specifically designed for the ultra-fast analytics endpoint (`/analytics/dashboard-fast`) and represent a critical performance optimization that transforms an unusably slow analytics page into a responsive, professional dashboard experience.