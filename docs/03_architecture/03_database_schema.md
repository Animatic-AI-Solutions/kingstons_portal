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
        date ongoing_start
        date client_declaration
        date privacy_declaration
        date full_fee_agreement
        date last_satisfactory_discussion
        text notes
    }

    addresses {
        bigserial id PK
        timestamptz created_at
        text line_1
        text line_2
        text line_3
        text line_4
        text line_5
    }

    product_owners {
        bigint id PK
        text firstname
        text surname
        text known_as
        text status
        text gender
        date dob
        int age
        text email_1
        text email_2
        text phone_1
        text phone_2
        text employment_status
        text occupation
        text aml_result
        date aml_date
        bigint address_id FK
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

    health_product_owners {
        bigserial id PK
        timestamptz created_at
        bigint product_owner_id FK
        text condition
        text name
        date date_of_diagnosis
        text status
        text medication
        timestamptz date_recorded
        text notes
    }

    health_special_relationships {
        bigserial id PK
        timestamptz created_at
        bigint special_relationship_id FK
        text condition
        text name
        date date_of_diagnosis
        text status
        text medication
        timestamptz date_recorded
        text notes
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

    special_relationships {
        bigserial id PK
        timestamptz created_at
        text type
        date dob
        text name
        int age
        boolean dependency
        bigint address_id FK
        text status
        text email
        text phone
        text relationship
        text notes
    }

    product_owner_special_relationships {
        bigserial id PK
        timestamptz created_at
        bigint product_owner_id FK
        bigint special_relationship_id FK
    }

    vulnerabilities_product_owners {
        bigserial id PK
        timestamptz created_at
        bigint product_owner_id FK
        text description
        text adjustments
        boolean diagnosed
        timestamptz date_recorded
        text status
        text notes
    }

    vulnerabilities_special_relationships {
        bigserial id PK
        timestamptz created_at
        bigint special_relationship_id FK
        text description
        text adjustments
        boolean diagnosed
        timestamptz date_recorded
        text status
        text notes
    }

    risk_assessments {
        bigserial id PK
        timestamptz created_at
        bigint product_owner_id FK
        text type
        numeric actual_score
        int category_score
        text risk_group
        date date
        text status
    }

    capacity_for_loss {
        bigserial id PK
        timestamptz created_at
        bigint product_owner_id FK
        int score
        text category
        date date_assessed
        text status
    }

    assigned_meetings {
        bigserial id PK
        timestamptz created_at
        bigint client_group_id FK
        text meeting_type
        int expected_month
        text status
        text notes
    }

    meeting_history {
        bigserial id PK
        timestamptz created_at
        bigint assigned_meeting_id FK
        date date_booked_for
        date date_actually_held
        text status
        int year
        text notes
    }

    aims {
        bigserial id PK
        timestamptz created_at
        bigint client_group_id FK
        text title
        text description
        int target_date
        text focus
        text status
        text notes
    }

    actions {
        bigserial id PK
        timestamptz created_at
        bigint client_group_id FK
        text title
        text description
        bigint assigned_advisor_id FK
        date due_date
        text priority
        text notes
        text status
    }

    income {
        bigserial id PK
        timestamptz created_at
        bigint client_group_id FK
        text category
        text source
        bigint product_owner_id FK
        text frequency
        numeric annual_amount
        timestamptz last_updated
        text notes
    }

    expenditure {
        bigserial id PK
        timestamptz created_at
        bigint client_group_id FK
        text category
        text description
        text frequency
        numeric annual_amount
        timestamptz last_updated
        text notes
    }

    other_products {
        bigserial id PK
        timestamptz created_at
        bigint provider_id FK
        text policy_number
        text cover_type
        text term_type
        numeric sum_assured
        text duration
        date start_date
        numeric monthly_payment
        date end_date
        boolean investment_element
        numeric surrender_value
        boolean in_trust
        text trust_notes
        text notes
    }

    product_owner_other_products {
        bigserial id PK
        timestamptz created_at
        bigint product_owner_id FK
        bigint other_product_id FK
    }

    profiles ||--o{ authentication : "has one"
    profiles ||--o{ session : "has many"
    client_groups ||--o{ client_group_product_owners : "links to"
    product_owners ||--o{ client_group_product_owners : "links to"
    addresses ||--o| product_owners : "linked to"
    client_groups ||--o{ client_products : "has many"
    available_providers ||--o{ client_products : "provides"
    portfolios ||--o{ client_products : "assigned to"
    client_products ||--o{ product_owner_products : "owned by"
    product_owners ||--o{ product_owner_products : "owns"
    product_owners ||--o{ health_product_owners : "has health records"
    special_relationships ||--o{ health_special_relationships : "has health records"
    product_owners ||--o{ vulnerabilities_product_owners : "has vulnerabilities"
    special_relationships ||--o{ vulnerabilities_special_relationships : "has vulnerabilities"
    product_owners ||--o{ risk_assessments : "has risk assessments"
    product_owners ||--o{ capacity_for_loss : "has capacity for loss"
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
    addresses ||--o| special_relationships : "linked to"
    product_owners ||--o{ product_owner_special_relationships : "has relationships"
    special_relationships ||--o{ product_owner_special_relationships : "linked to owners"
    client_groups ||--o{ assigned_meetings : "has meetings"
    assigned_meetings ||--o{ meeting_history : "has history"
    client_groups ||--o{ aims : "has aims"
    client_groups ||--o{ actions : "has actions"
    profiles ||--o{ actions : "assigned to"
    client_groups ||--o{ income : "has income"
    product_owners ||--o{ income : "earns"
    client_groups ||--o{ expenditure : "has expenditure"
    available_providers ||--o{ other_products : "provides"
    product_owners ||--o{ product_owner_other_products : "owns"
    other_products ||--o{ product_owner_other_products : "owned by"
}
```

## 2. Core Tables & Entities

These tables represent the foundational entities of the system.

-   **`profiles`**: Stores user data for application administrators and advisors.
-   **`authentication`**: Manages user credentials, linked directly to `profiles`.
-   **`session`**: Stores active user login sessions.
-   **`client_groups`**: The central table for client entities. A group can represent a family, an individual, or a trust. Includes compliance tracking fields (ongoing_start, client_declaration, privacy_declaration, full_fee_agreement) and relationship management fields (last_satisfactory_discussion, notes) to support regulatory requirements and ongoing client relationship management.
-   **`product_owners`**: Represents individuals who are owners or beneficiaries of financial products. Includes comprehensive personal information (gender, DOB, place of birth), contact details (email_1, email_2, phone_1, phone_2), employment information (employment_status, occupation), KYC/AML compliance fields (passport_expiry_date, ni_number, aml_result, aml_date), and residential data (moved_in_date, address_id foreign key).
-   **`addresses`**: Stores physical address information for product owners with five address lines (line_1 through line_5). Linked to `product_owners` via one-to-one relationship through the `address_id` foreign key.
-   **`special_relationships`**: Stores information about personal and professional relationships associated with product owners. Includes relationship type (personal/professional), demographic information (name, DOB, age), dependency status, contact details, address linkage, and notes. Supports tracking of family members, dependents, business partners, and other significant relationships.
-   **`health_product_owners`**: Stores health conditions and medical information for product owners. Each record links directly to a product owner and tracks condition names, diagnosis dates, current status, medications, and notes. Linked to product_owners via foreign key with CASCADE DELETE behavior. Normalized design with dedicated table instead of polymorphic relationship.
-   **`health_special_relationships`**: Stores health conditions and medical information for related individuals. Each record links directly to a special relationship and tracks condition names, diagnosis dates, current status, medications, and notes. Linked to special_relationships via foreign key with CASCADE DELETE behavior. Enables comprehensive health tracking for dependents, family members, and other related individuals.
-   **`vulnerabilities_product_owners`**: Stores vulnerability information and required adjustments for product owners. Each record links directly to a product owner and tracks vulnerability descriptions, necessary adjustments, diagnosis status, and notes. Linked to product_owners via foreign key with CASCADE DELETE behavior. Supports tracking of vulnerabilities, disabilities, and accessibility requirements in a normalized design.
-   **`vulnerabilities_special_relationships`**: Stores vulnerability information and required adjustments for related individuals. Each record links directly to a special relationship and tracks vulnerability descriptions, necessary adjustments, diagnosis status, and notes. Linked to special_relationships via foreign key with CASCADE DELETE behavior. Enables comprehensive vulnerability and accessibility tracking for dependents, family members, and other related individuals.
-   **`risk_assessments`**: Stores financial risk assessment results for product owners. Tracks assessment type (FinaMetrica or Manual), actual score (0-100), category score (1-7), risk group classification, and assessment date. Supports multiple assessments over time to track changes in risk profile. CHECK constraints enforce valid score ranges.
-   **`capacity_for_loss`**: Stores capacity for loss assessments for product owners. Tracks score (1-10), category classification, assessment date, and status. Helps determine appropriate investment strategies based on financial capacity to absorb losses. CHECK constraint enforces valid score range.
-   **`assigned_meetings`**: Stores expected client meetings for planning purposes. Each record defines a meeting type that a client group should have annually, with an expected month (1-12 validated by CHECK constraint), current status, and notes. Linked to client_groups via foreign key with CASCADE DELETE behavior.
-   **`meeting_history`**: Records actual meeting occurrences for tracking and compliance purposes. Each record captures a specific instance of a meeting, including dates booked and actually held, status, year, and notes. Linked to assigned_meetings via foreign key with CASCADE DELETE behavior, maintaining a complete audit trail of all meetings.
-   **`aims`**: Stores client goals and objectives for long-term planning. Each aim includes a title, description, target year, focus area, current status, and notes. Linked to client_groups via foreign key with CASCADE DELETE behavior. Helps advisors track and work towards client aspirations and financial goals.
-   **`actions`**: Stores actionable tasks and to-do items for client management. Each action includes title, description, optional assigned advisor (foreign key to profiles), due date, priority level, notes, and status. Linked to client_groups via foreign key with CASCADE DELETE behavior. When an assigned advisor is deleted, the action remains but assigned_advisor_id is set to NULL. Enables task management and delegation within the advisory team.
-   **`income`**: Stores client income sources for financial planning and cash flow analysis. Each income record includes category, source description, optional product owner (foreign key to product_owners), frequency, annual amount, last updated timestamp, and notes. Linked to client_groups via foreign key with CASCADE DELETE behavior. When a product owner is deleted, the income record remains but product_owner_id is set to NULL. Supports tracking of salaries, rental income, investment income, pensions, and other income sources.
-   **`expenditure`**: Stores client expenditure items for budgeting and cash flow analysis. Each expenditure record includes category, description, frequency, annual amount, last updated timestamp, and notes. Linked to client_groups via foreign key with CASCADE DELETE behavior. Categories include Home, Personal, Pets, Children, Financial, Rental & Second Homes, Car(s) and Travel, and Discretionary spending.
-   **`other_products`**: Stores protection policies and other non-investment financial products. Each product includes provider (foreign key to available_providers), policy number, cover type (e.g., Life Cover, Critical Illness), term type, sum assured, duration, start/end dates, monthly payment, investment element flag, surrender value, trust information (in_trust flag and trust_notes), and general notes. Linked to available_providers via foreign key with SET NULL behavior. Supports tracking of life insurance, critical illness cover, income protection, and other protection policies.
-   **`product_owner_other_products`**: Junction table creating many-to-many relationships between product_owners and other_products. Each record links a product owner to a protection policy, enabling joint ownership and multiple owners per policy. Includes unique constraint to prevent duplicate relationships. Linked to both product_owners and other_products via foreign keys with CASCADE DELETE behavior.
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
-   **`product_owner_special_relationships`**: Links `product_owners` to `special_relationships`, enabling tracking of multiple relationships per product owner and allowing the same relationship to be associated with multiple product owners (e.g., shared dependents).
-   **`product_owner_other_products`**: Links `product_owners` to `other_products`, enabling tracking of protection policy ownership. Supports joint ownership scenarios where multiple product owners share a single protection policy. Unique constraint prevents duplicate relationships.

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