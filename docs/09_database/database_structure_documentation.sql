-- ============================================================================
-- KINGSTON'S PORTAL - DATABASE STRUCTURE DOCUMENTATION
-- ============================================================================
-- Generated on: 2025-08-07 16:24:58
-- Database: kingstons_portal
-- PostgreSQL Version: PostgreSQL 17.5 on x86_64-windows, compiled by msvc-19.44.35209, 64-bit
-- Current User: kingstons_app
-- ============================================================================

-- This file contains the complete structure of the Kingston's Portal database
-- including all tables, views, functions, indexes, triggers, sequences, and constraints.
-- It serves as comprehensive documentation for the database architecture.

-- ============================================================================
-- TABLE OF CONTENTS
-- ============================================================================
-- 1. SEQUENCES
-- 2. TABLES
-- 3. VIEWS
-- 4. FUNCTIONS AND PROCEDURES
-- 5. INDEXES
-- 6. TRIGGERS
-- 7. CONSTRAINTS
-- ============================================================================


-- ============================================================================
-- 1. SEQUENCES
-- ============================================================================


-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- Table: addresses
-- Stores address information for product owners
-- One-to-one relationship: Each product owner can have one address
CREATE TABLE addresses (
    id bigserial NOT NULL -- PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    line_1 text,
    line_2 text,
    line_3 text,
    line_4 text,
    line_5 text
);

-- Table: authentication
CREATE TABLE authentication (
    auth_id bigint(64) NOT NULL -- PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    password_hash text,
    profiles_id bigint(64) -- FOREIGN KEY -> profiles.id,
    last_login text,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: available_funds
CREATE TABLE available_funds (
    id bigint(64) NOT NULL -- PRIMARY KEY,
    fund_name character varying(60),
    isin_number text,
    risk_factor smallint(16),
    fund_cost numeric(6,2),
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: available_portfolio_funds
CREATE TABLE available_portfolio_funds (
    id bigint(64) NOT NULL -- PRIMARY KEY,
    template_portfolio_generation_id bigint(64) -- FOREIGN KEY -> template_portfolio_generations.id,
    fund_id bigint(64) -- FOREIGN KEY -> available_funds.id,
    target_weighting numeric(5,2),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: available_portfolios
CREATE TABLE available_portfolios (
    id bigint(64) NOT NULL -- PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text
);

-- Table: available_providers
CREATE TABLE available_providers (
    id bigint(64) NOT NULL -- PRIMARY KEY,
    name text,
    status text NOT NULL DEFAULT 'active'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    theme_color text
);

-- Table: client_group_product_owners
CREATE TABLE client_group_product_owners (
    id bigint(64) NOT NULL -- PRIMARY KEY,
    client_group_id bigint(64) -- FOREIGN KEY -> client_groups.id,
    product_owner_id bigint(64) -- FOREIGN KEY -> product_owners.id,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: client_groups
CREATE TABLE client_groups (
    id bigint(64) NOT NULL -- PRIMARY KEY,
    advisor text,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    name text,
    type text DEFAULT 'Family'::text,
    advisor_id bigint(64)
);

-- Table: client_products
CREATE TABLE client_products (
    id bigint(64) NOT NULL -- PRIMARY KEY,
    client_id bigint(64) -- FOREIGN KEY -> client_groups.id,
    product_name text,
    product_type text,
    status text DEFAULT 'active'::text,
    start_date date,
    end_date date,
    provider_id bigint(64) -- FOREIGN KEY -> available_providers.id,
    portfolio_id bigint(64) -- FOREIGN KEY -> portfolios.id,
    plan_number text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    notes text,
    template_generation_id bigint(64),
    fixed_fee_direct text,
    fixed_fee_facilitated text,
    percentage_fee_facilitated text
);

-- Table: health
-- Stores health conditions and medical information
-- Can be associated with either a product owner OR a special relationship (but not both)
CREATE TABLE health (
    id bigserial NOT NULL -- PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    product_owner_id bigint -- FOREIGN KEY -> product_owners.id,
    special_relationship_id bigint -- FOREIGN KEY -> special_relationships.id,
    condition text,
    name text,
    date_of_diagnosis date,
    status text,
    medication text,
    date_recorded timestamp with time zone DEFAULT now(),
    notes text
    -- CONSTRAINT: Exactly one of product_owner_id or special_relationship_id must be populated
);

-- Table: holding_activity_log
CREATE TABLE holding_activity_log (
    id bigint(64) NOT NULL -- PRIMARY KEY,
    product_id bigint(64) -- FOREIGN KEY -> client_products.id,
    portfolio_fund_id bigint(64) -- FOREIGN KEY -> portfolio_funds.id,
    activity_type text,
    amount numeric(12,2),
    activity_timestamp timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: portfolio_fund_irr_values
CREATE TABLE portfolio_fund_irr_values (
    id bigint(64) NOT NULL -- PRIMARY KEY,
    fund_id bigint(64) -- FOREIGN KEY -> portfolio_funds.id,
    date date,
    irr_result numeric(8,4),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    fund_valuation_id bigint(64)
);

-- Table: portfolio_fund_valuations
CREATE TABLE portfolio_fund_valuations (
    id bigint(64) NOT NULL -- PRIMARY KEY,
    portfolio_fund_id bigint(64) -- FOREIGN KEY -> portfolio_funds.id,
    valuation_date date,
    valuation numeric(12,2),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: portfolio_funds
CREATE TABLE portfolio_funds (
    id bigint(64) NOT NULL -- PRIMARY KEY,
    portfolio_id bigint(64) -- FOREIGN KEY -> portfolios.id,
    available_funds_id bigint(64) -- FOREIGN KEY -> available_funds.id,
    target_weighting numeric(5,2),
    amount_invested numeric(12,2),
    start_date date,
    end_date date,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: portfolio_irr_values
CREATE TABLE portfolio_irr_values (
    id bigint(64) NOT NULL -- PRIMARY KEY,
    portfolio_id bigint(64) -- FOREIGN KEY -> portfolios.id,
    date date,
    irr_result numeric(8,4),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    portfolio_valuation_id bigint(64)
);

-- Table: portfolio_valuations
CREATE TABLE portfolio_valuations (
    id bigint(64) NOT NULL -- PRIMARY KEY,
    portfolio_id bigint(64) -- FOREIGN KEY -> portfolios.id,
    valuation_date date,
    valuation numeric(12,2),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: portfolios
CREATE TABLE portfolios (
    id bigint(64) NOT NULL -- PRIMARY KEY,
    portfolio_name text,
    status text DEFAULT 'active'::text,
    start_date date,
    end_date date,
    template_generation_id bigint(64) -- FOREIGN KEY -> template_portfolio_generations.id,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: product_owner_products
CREATE TABLE product_owner_products (
    id bigint(64) NOT NULL -- PRIMARY KEY,
    product_owner_id bigint(64) -- FOREIGN KEY -> product_owners.id,
    product_id bigint(64) -- FOREIGN KEY -> client_products.id,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: product_owners
-- Represents individuals who are owners or beneficiaries of financial products
-- Includes comprehensive personal information, contact details, and KYC/AML compliance fields
CREATE TABLE product_owners (
    id bigint(64) NOT NULL -- PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    status text DEFAULT 'active'::text,
    firstname text DEFAULT ''::text,
    surname text,
    known_as text,

    -- Personal Information
    gender text,
    previous_names text,
    dob date,
    age integer,
    place_of_birth text,

    -- Contact Information
    email_1 text,
    email_2 text,
    phone_1 text,
    phone_2 text,

    -- Residential Information
    moved_in_date date,
    address_id bigint -- FOREIGN KEY -> addresses.id,

    -- Client Profiling
    three_words text,
    share_data_with text,

    -- Employment Information
    employment_status text,
    occupation text,

    -- Identity & Compliance - KYC/AML
    passport_expiry_date date,
    ni_number text,
    aml_result text,
    aml_date date
);

-- Table: profiles
CREATE TABLE profiles (
    id bigint(64) NOT NULL -- PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    first_name text,
    last_name text,
    email text,
    profile_picture_url text DEFAULT '/images/Companylogo2.png'::text,
    preferred_client_view text DEFAULT 'list'::text,
    preferred_landing_page text DEFAULT '/'::text
);

-- Table: provider_switch_log
CREATE TABLE provider_switch_log (
    id bigint(64) NOT NULL -- PRIMARY KEY,
    client_product_id bigint(64) -- FOREIGN KEY -> client_products.id,
    previous_provider_id bigint(64) -- FOREIGN KEY -> available_providers.id,
    new_provider_id bigint(64) -- FOREIGN KEY -> available_providers.id,
    switch_date timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    description text
);

-- Table: session
CREATE TABLE session (
    session_id text NOT NULL -- PRIMARY KEY,
    profiles_id bigint(64) -- FOREIGN KEY -> profiles.id,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_activity text
);

-- Table: special_relationships
-- Stores personal and professional relationships associated with product owners
CREATE TABLE special_relationships (
    id bigserial NOT NULL -- PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    type text,
    dob date,
    name text,
    age integer,
    dependency boolean DEFAULT false,
    address_id bigint -- FOREIGN KEY -> addresses.id,
    status text DEFAULT 'active'::text,
    email text,
    phone text,
    relationship text,
    notes text
);

-- Table: product_owner_special_relationships
-- Junction table for many-to-many relationship between product owners and special relationships
CREATE TABLE product_owner_special_relationships (
    id bigserial NOT NULL -- PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    product_owner_id bigint NOT NULL -- FOREIGN KEY -> product_owners.id,
    special_relationship_id bigint NOT NULL -- FOREIGN KEY -> special_relationships.id
);

-- Table: vulnerabilities
-- Stores vulnerability information for product owners and special relationships
-- Can be associated with either a product owner OR a special relationship (but not both)
CREATE TABLE vulnerabilities (
    id bigserial NOT NULL -- PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    product_owner_id bigint -- FOREIGN KEY -> product_owners.id,
    special_relationship_id bigint -- FOREIGN KEY -> special_relationships.id,
    description text,
    adjustments text,
    diagnosed boolean DEFAULT false,
    date_recorded timestamp with time zone DEFAULT now(),
    status text,
    notes text
    -- CONSTRAINT: Exactly one of product_owner_id or special_relationship_id must be populated
);

-- Table: template_portfolio_generations
CREATE TABLE template_portfolio_generations (
    id bigint(64) NOT NULL -- PRIMARY KEY,
    available_portfolio_id bigint(64) -- FOREIGN KEY -> available_portfolios.id,
    version_number integer(32),
    generation_name text,
    description text,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Table: user_page_presence
CREATE TABLE user_page_presence (
    id bigint(64) NOT NULL -- PRIMARY KEY,
    user_id bigint(64) NOT NULL -- FOREIGN KEY -> profiles.id,
    page_identifier text NOT NULL,
    entered_at timestamp with time zone DEFAULT now(),
    last_seen timestamp with time zone DEFAULT now(),
    user_info jsonb DEFAULT '{}'::jsonb
);


-- ============================================================================
-- 3. VIEWS
-- ============================================================================

-- View: advisor_client_summary
CREATE OR REPLACE VIEW advisor_client_summary AS
 SELECT advisor,
    count(DISTINCT id) AS client_count,
    count(DISTINCT
        CASE
            WHEN (status = 'active'::text) THEN id
            ELSE NULL::bigint
        END) AS active_client_count,
    string_agg(DISTINCT name, ', '::text) AS client_names
   FROM client_groups
  WHERE ((advisor IS NOT NULL) AND (advisor <> ''::text))
  GROUP BY advisor
  ORDER BY (count(DISTINCT
        CASE
            WHEN (status = 'active'::text) THEN id
            ELSE NULL::bigint
        END)) DESC, advisor;;

-- View: analytics_dashboard_summary
CREATE OR REPLACE VIEW analytics_dashboard_summary AS
 SELECT sum(lpv.valuation) AS total_fum,
    ( SELECT company_irr_cache.irr_value
           FROM company_irr_cache
          WHERE (company_irr_cache.calculation_type = 'company_irr'::text)
         LIMIT 1) AS company_irr,
    count(DISTINCT cg.id) AS total_clients,
    count(DISTINCT cp.id) AS total_accounts,
    count(DISTINCT af.id) AS total_funds,
    ( SELECT company_irr_cache.cache_timestamp
           FROM company_irr_cache
          WHERE (company_irr_cache.calculation_type = 'last_update'::text)
         LIMIT 1) AS last_irr_calculation
   FROM (((((client_products cp
     JOIN client_groups cg ON ((cp.client_id = cg.id)))
     JOIN portfolios p ON ((cp.portfolio_id = p.id)))
     JOIN portfolio_funds pf ON ((p.id = pf.portfolio_id)))
     JOIN available_funds af ON ((pf.available_funds_id = af.id)))
     LEFT JOIN latest_portfolio_valuations lpv ON ((p.id = lpv.portfolio_id)))
  WHERE ((cp.status = 'active'::text) AND (cg.status = 'active'::text) AND (p.status = 'active'::text) AND (pf.status = 'active'::text) AND (af.status = 'active'::text));;

-- View: client_group_complete_data
CREATE OR REPLACE VIEW client_group_complete_data AS
 SELECT cg.id,
    cg.name,
    cg.advisor,
    cg.type,
    cg.status,
    cg.created_at,
    count(DISTINCT cp.id) AS product_count,
    count(DISTINCT cp.id) FILTER (WHERE (cp.status = 'active'::text)) AS active_product_count,
    count(DISTINCT po.id) AS product_owner_count,
    count(DISTINCT p.id) AS portfolio_count,
    count(DISTINCT pf.id) AS fund_holdings_count,
    sum(lpv.valuation) AS total_portfolio_value,
    avg(lpir.irr_result) AS avg_portfolio_irr,
    string_agg(DISTINCT po.known_as, ', '::text) AS product_owners,
    string_agg(DISTINCT ap.name, ', '::text) AS providers,
    max(lpv.valuation_date) AS latest_valuation_date,
    max(lpir.date) AS latest_irr_date
   FROM ((((((((client_groups cg
     LEFT JOIN client_products cp ON ((cg.id = cp.client_id)))
     LEFT JOIN client_group_product_owners cgpo ON ((cg.id = cgpo.client_group_id)))
     LEFT JOIN product_owners po ON (((cgpo.product_owner_id = po.id) AND (po.status = 'active'::text))))
     LEFT JOIN available_providers ap ON ((cp.provider_id = ap.id)))
     LEFT JOIN portfolios p ON (((cp.portfolio_id = p.id) AND (p.status = 'active'::text))))
     LEFT JOIN portfolio_funds pf ON (((p.id = pf.portfolio_id) AND (pf.status = 'active'::text))))
     LEFT JOIN latest_portfolio_valuations lpv ON ((p.id = lpv.portfolio_id)))
     LEFT JOIN latest_portfolio_irr_values lpir ON ((p.id = lpir.portfolio_id)))
  WHERE (cg.status = 'active'::text)
  GROUP BY cg.id, cg.name, cg.advisor, cg.type, cg.status, cg.created_at;;

-- View: client_groups_summary
CREATE OR REPLACE VIEW client_groups_summary AS
 SELECT cg.id,
    cg.name,
    cg.advisor,
    cg.type,
    cg.status,
    cg.created_at,
    count(DISTINCT cp.id) AS total_products,
    count(DISTINCT cp.id) FILTER (WHERE (cp.status = 'active'::text)) AS active_products,
    count(DISTINCT po.id) AS product_owners_count,
    sum(COALESCE(lpv.valuation, (0)::numeric)) AS total_value,
    avg(lpir.irr_result) AS avg_irr,
    max(lpv.valuation_date) AS latest_valuation_date,
    string_agg(DISTINCT ap.name, ', '::text) AS providers_used
   FROM (((((((client_groups cg
     LEFT JOIN client_products cp ON ((cg.id = cp.client_id)))
     LEFT JOIN client_group_product_owners cgpo ON ((cg.id = cgpo.client_group_id)))
     LEFT JOIN product_owners po ON (((cgpo.product_owner_id = po.id) AND (po.status = 'active'::text))))
     LEFT JOIN available_providers ap ON ((cp.provider_id = ap.id)))
     LEFT JOIN portfolios p ON (((cp.portfolio_id = p.id) AND (p.status = 'active'::text))))
     LEFT JOIN latest_portfolio_valuations lpv ON ((p.id = lpv.portfolio_id)))
     LEFT JOIN latest_portfolio_irr_values lpir ON ((p.id = lpir.portfolio_id)))
  WHERE (cg.status = 'active'::text)
  GROUP BY cg.id, cg.name, cg.advisor, cg.type, cg.status, cg.created_at
  ORDER BY (sum(COALESCE(lpv.valuation, (0)::numeric))) DESC NULLS LAST, cg.name;;

-- View: company_irr_cache
CREATE OR REPLACE VIEW company_irr_cache AS
 SELECT 'company_irr'::text AS calculation_type,
    avg(lpir.irr_result) AS irr_value,
    now() AS cache_timestamp,
    'active'::text AS status
   FROM ((client_products cp
     JOIN portfolios p ON ((cp.portfolio_id = p.id)))
     LEFT JOIN latest_portfolio_irr_values lpir ON ((p.id = lpir.portfolio_id)))
  WHERE ((cp.status = 'active'::text) AND (p.status = 'active'::text))
UNION ALL
 SELECT 'last_update'::text AS calculation_type,
    NULL::numeric AS irr_value,
    now() AS cache_timestamp,
    'active'::text AS status;;

-- View: company_revenue_analytics
CREATE OR REPLACE VIEW company_revenue_analytics AS
 SELECT sum(
        CASE
            WHEN ((cp.status = 'active'::text) AND (cp.fixed_fee_direct IS NOT NULL)) THEN (cp.fixed_fee_direct)::numeric
            ELSE (0)::numeric
        END) AS total_fixed_direct_revenue,
    sum(
        CASE
            WHEN ((cp.status = 'active'::text) AND (cp.fixed_fee_facilitated IS NOT NULL)) THEN (cp.fixed_fee_facilitated)::numeric
            ELSE (0)::numeric
        END) AS total_fixed_facilitated_revenue,
    sum(
        CASE
            WHEN ((cp.status = 'active'::text) AND (cp.percentage_fee_facilitated IS NOT NULL) AND (pv.total_value > (0)::numeric)) THEN (pv.total_value * ((cp.percentage_fee_facilitated)::numeric / 100.0))
            ELSE (0)::numeric
        END) AS total_percentage_facilitated_revenue,
    sum(
        CASE
            WHEN (cp.status = 'active'::text) THEN (COALESCE((cp.fixed_fee_direct)::numeric, (0)::numeric) + COALESCE((cp.fixed_fee_facilitated)::numeric, (0)::numeric) +
            CASE
                WHEN ((cp.percentage_fee_facilitated IS NOT NULL) AND (pv.total_value > (0)::numeric)) THEN (pv.total_value * ((cp.percentage_fee_facilitated)::numeric / 100.0))
                ELSE (0)::numeric
            END)
            ELSE (0)::numeric
        END) AS total_annual_revenue,
    count(DISTINCT cp.provider_id) AS active_providers,
    count(DISTINCT cp.client_id) AS active_clients,
    count(DISTINCT cp.id) AS active_products,
    sum(COALESCE(pv.total_value, (0)::numeric)) AS total_fum,
    avg(
        CASE
            WHEN ((cp.percentage_fee_facilitated IS NOT NULL) AND ((cp.percentage_fee_facilitated)::numeric > (0)::numeric)) THEN (cp.percentage_fee_facilitated)::numeric
            ELSE NULL::numeric
        END) AS avg_percentage_facilitated_fee,
    avg(
        CASE
            WHEN ((cp.fixed_fee_facilitated IS NOT NULL) AND ((cp.fixed_fee_facilitated)::numeric > (0)::numeric)) THEN (cp.fixed_fee_facilitated)::numeric
            ELSE NULL::numeric
        END) AS avg_fixed_facilitated_fee,
    avg(
        CASE
            WHEN ((cp.fixed_fee_direct IS NOT NULL) AND ((cp.fixed_fee_direct)::numeric > (0)::numeric)) THEN (cp.fixed_fee_direct)::numeric
            ELSE NULL::numeric
        END) AS avg_fixed_direct_fee,
    CURRENT_TIMESTAMP AS calculated_at
   FROM (client_products cp
     LEFT JOIN ( SELECT p.id AS portfolio_id,
            sum(COALESCE(lpfv.valuation, (0)::numeric)) AS total_value
           FROM ((portfolios p
             LEFT JOIN portfolio_funds pf ON (((p.id = pf.portfolio_id) AND (pf.status = 'active'::text))))
             LEFT JOIN latest_portfolio_fund_valuations lpfv ON ((pf.id = lpfv.portfolio_fund_id)))
          GROUP BY p.id) pv ON ((cp.portfolio_id = pv.portfolio_id)));;

-- View: complete_fund_data
CREATE OR REPLACE VIEW complete_fund_data AS
 SELECT af.id,
    af.fund_name,
    af.isin_number,
    af.risk_factor,
    af.fund_cost,
    af.status,
    af.created_at,
    count(DISTINCT pf.id) AS portfolio_holdings,
    count(DISTINCT pf.portfolio_id) AS portfolio_count,
    sum(pf.amount_invested) AS total_invested,
    avg(pf.target_weighting) AS avg_target_weighting,
    sum(lpfv.valuation) AS total_current_value,
    avg(lpfir.irr_result) AS avg_irr,
    count(DISTINCT hal.id) AS total_activities,
    max(hal.activity_timestamp) AS last_activity_date
   FROM ((((available_funds af
     LEFT JOIN portfolio_funds pf ON (((af.id = pf.available_funds_id) AND (pf.status = 'active'::text))))
     LEFT JOIN latest_portfolio_fund_valuations lpfv ON ((pf.id = lpfv.portfolio_fund_id)))
     LEFT JOIN latest_portfolio_fund_irr_values lpfir ON ((pf.id = lpfir.fund_id)))
     LEFT JOIN holding_activity_log hal ON ((pf.id = hal.portfolio_fund_id)))
  WHERE (af.status = 'active'::text)
  GROUP BY af.id, af.fund_name, af.isin_number, af.risk_factor, af.fund_cost, af.status, af.created_at;;

-- View: fund_activity_summary
CREATE OR REPLACE VIEW fund_activity_summary AS
 SELECT pf.id AS portfolio_fund_id,
    pf.portfolio_id,
    pf.available_funds_id,
    af.fund_name,
    af.isin_number,
    af.risk_factor,
    af.fund_cost,
    pf.target_weighting,
    pf.amount_invested,
    pf.start_date,
    pf.status,
    count(hal.id) AS activity_count,
    sum(
        CASE
            WHEN (hal.activity_type = 'Investment'::text) THEN hal.amount
            ELSE (0)::numeric
        END) AS total_investments,
    sum(
        CASE
            WHEN (hal.activity_type = 'Withdrawal'::text) THEN hal.amount
            ELSE (0)::numeric
        END) AS total_withdrawals,
    sum(
        CASE
            WHEN (hal.activity_type = 'FundSwitchIn'::text) THEN hal.amount
            ELSE (0)::numeric
        END) AS total_switch_in,
    sum(
        CASE
            WHEN (hal.activity_type = 'FundSwitchOut'::text) THEN hal.amount
            ELSE (0)::numeric
        END) AS total_switch_out,
    max(hal.activity_timestamp) AS last_activity_date,
    lpfv.valuation AS latest_valuation,
    lpfv.valuation_date AS latest_valuation_date,
    lpfir.irr_result AS latest_irr,
    lpfir.date AS latest_irr_date,
    sum(
        CASE
            WHEN (hal.activity_type = 'RegularInvestment'::text) THEN hal.amount
            ELSE (0)::numeric
        END) AS total_regular_investments,
    sum(
        CASE
            WHEN (hal.activity_type = 'TaxUplift'::text) THEN hal.amount
            ELSE (0)::numeric
        END) AS total_tax_uplift,
    sum(
        CASE
            WHEN (hal.activity_type = 'ProductSwitchIn'::text) THEN hal.amount
            ELSE (0)::numeric
        END) AS total_product_switch_in,
    sum(
        CASE
            WHEN (hal.activity_type = 'ProductSwitchOut'::text) THEN hal.amount
            ELSE (0)::numeric
        END) AS total_product_switch_out
   FROM ((((portfolio_funds pf
     JOIN available_funds af ON ((pf.available_funds_id = af.id)))
     LEFT JOIN holding_activity_log hal ON ((pf.id = hal.portfolio_fund_id)))
     LEFT JOIN latest_portfolio_fund_valuations lpfv ON ((pf.id = lpfv.portfolio_fund_id)))
     LEFT JOIN latest_portfolio_fund_irr_values lpfir ON ((pf.id = lpfir.fund_id)))
  WHERE (af.status = 'active'::text)
  GROUP BY pf.id, pf.portfolio_id, pf.available_funds_id, af.fund_name, af.isin_number, af.risk_factor, af.fund_cost, pf.target_weighting, pf.amount_invested, pf.start_date, pf.status, lpfv.valuation, lpfv.valuation_date, lpfir.irr_result, lpfir.date;;

-- View: fund_distribution_fast
CREATE OR REPLACE VIEW fund_distribution_fast AS
 SELECT af.id,
    af.fund_name AS name,
    COALESCE(sum(lpfv.valuation), sum(pf.amount_invested), (0)::numeric) AS amount,
    count(pf.id) AS fund_holdings
   FROM ((available_funds af
     LEFT JOIN portfolio_funds pf ON (((af.id = pf.available_funds_id) AND (pf.status = 'active'::text))))
     LEFT JOIN latest_portfolio_fund_valuations lpfv ON ((pf.id = lpfv.portfolio_fund_id)))
  GROUP BY af.id, af.fund_name
 HAVING (COALESCE(sum(lpfv.valuation), sum(pf.amount_invested), (0)::numeric) > (0)::numeric)
  ORDER BY COALESCE(sum(lpfv.valuation), sum(pf.amount_invested), (0)::numeric) DESC;;

-- View: fund_historical_irr
CREATE OR REPLACE VIEW fund_historical_irr AS
 SELECT pfir.fund_id,
    pf.portfolio_id,
    af.fund_name,
    af.isin_number,
    af.risk_factor,
    pfir.date,
    pfir.irr_result,
    pfir.created_at,
    p.portfolio_name,
    cp.client_id,
    cg.name AS client_name,
    cp.product_name,
    ap.name AS provider_name
   FROM ((((((portfolio_fund_irr_values pfir
     JOIN portfolio_funds pf ON ((pfir.fund_id = pf.id)))
     JOIN available_funds af ON ((pf.available_funds_id = af.id)))
     JOIN portfolios p ON ((pf.portfolio_id = p.id)))
     JOIN client_products cp ON ((p.id = cp.portfolio_id)))
     JOIN client_groups cg ON ((cp.client_id = cg.id)))
     JOIN available_providers ap ON ((cp.provider_id = ap.id)))
  WHERE ((pf.status = 'active'::text) AND (af.status = 'active'::text) AND (p.status = 'active'::text) AND (cg.status = 'active'::text))
  ORDER BY pfir.date DESC, pfir.fund_id;;

-- View: latest_portfolio_fund_irr_values
CREATE OR REPLACE VIEW latest_portfolio_fund_irr_values AS
 SELECT DISTINCT ON (fund_id) id,
    fund_id,
    date,
    irr_result,
    created_at
   FROM portfolio_fund_irr_values
  ORDER BY fund_id, date DESC, created_at DESC;;

-- View: latest_portfolio_fund_valuations
CREATE OR REPLACE VIEW latest_portfolio_fund_valuations AS
 SELECT DISTINCT ON (portfolio_fund_id) id,
    portfolio_fund_id,
    valuation_date,
    valuation,
    created_at
   FROM portfolio_fund_valuations
  ORDER BY portfolio_fund_id, valuation_date DESC, created_at DESC;;

-- View: latest_portfolio_irr_values
CREATE OR REPLACE VIEW latest_portfolio_irr_values AS
 SELECT DISTINCT ON (portfolio_id) id,
    portfolio_id,
    date,
    irr_result,
    created_at
   FROM portfolio_irr_values
  ORDER BY portfolio_id, date DESC, created_at DESC;;

-- View: latest_portfolio_valuations
CREATE OR REPLACE VIEW latest_portfolio_valuations AS
 SELECT DISTINCT ON (portfolio_id) id,
    portfolio_id,
    valuation_date,
    valuation,
    created_at
   FROM portfolio_valuations
  ORDER BY portfolio_id, valuation_date DESC, created_at DESC;;

-- View: portfolio_historical_irr
CREATE OR REPLACE VIEW portfolio_historical_irr AS
 SELECT pir.portfolio_id,
    p.portfolio_name,
    pir.date,
    pir.irr_result,
    pir.created_at,
    cp.client_id,
    cg.name AS client_name,
    cp.product_name,
    ap.name AS provider_name,
    ap.theme_color AS provider_color
   FROM ((((portfolio_irr_values pir
     JOIN portfolios p ON ((pir.portfolio_id = p.id)))
     JOIN client_products cp ON ((p.id = cp.portfolio_id)))
     JOIN client_groups cg ON ((cp.client_id = cg.id)))
     JOIN available_providers ap ON ((cp.provider_id = ap.id)))
  WHERE ((p.status = 'active'::text) AND (cg.status = 'active'::text))
  ORDER BY pir.date DESC, pir.portfolio_id;;

-- View: portfolio_performance_history
CREATE OR REPLACE VIEW portfolio_performance_history AS
 SELECT p.id AS portfolio_id,
    p.portfolio_name,
    p.status,
    p.start_date,
    cp.client_id,
    cg.name AS client_name,
    cp.product_name,
    ap.name AS provider_name,
    ap.theme_color AS provider_color,
    lpv.valuation AS latest_valuation,
    lpv.valuation_date AS latest_valuation_date,
    lpir.irr_result AS latest_irr,
    lpir.date AS latest_irr_date,
    count(DISTINCT pf.id) AS fund_count,
    sum(pf.amount_invested) AS total_invested,
    sum(pf.target_weighting) AS total_target_weighting
   FROM ((((((portfolios p
     JOIN client_products cp ON ((p.id = cp.portfolio_id)))
     JOIN client_groups cg ON ((cp.client_id = cg.id)))
     JOIN available_providers ap ON ((cp.provider_id = ap.id)))
     LEFT JOIN latest_portfolio_valuations lpv ON ((p.id = lpv.portfolio_id)))
     LEFT JOIN latest_portfolio_irr_values lpir ON ((p.id = lpir.portfolio_id)))
     LEFT JOIN portfolio_funds pf ON (((p.id = pf.portfolio_id) AND (pf.status = 'active'::text))))
  WHERE ((p.status = 'active'::text) AND (cp.status = 'active'::text) AND (cg.status = 'active'::text))
  GROUP BY p.id, p.portfolio_name, p.status, p.start_date, cp.client_id, cg.name, cp.product_name, ap.name, ap.theme_color, lpv.valuation, lpv.valuation_date, lpir.irr_result, lpir.date;;

-- View: product_owner_details
CREATE OR REPLACE VIEW product_owner_details AS
 SELECT po.id,
    po.firstname,
    po.surname,
    po.known_as,
    po.status,
    po.created_at,
    COALESCE(po.known_as, concat(po.firstname, ' ', po.surname)) AS display_name,
    count(DISTINCT cgpo.client_group_id) AS client_group_count,
    count(DISTINCT pop.product_id) AS product_count,
    string_agg(DISTINCT cg.name, ', '::text) AS client_groups,
    string_agg(DISTINCT cp.product_name, ', '::text) AS products
   FROM ((((product_owners po
     LEFT JOIN client_group_product_owners cgpo ON ((po.id = cgpo.product_owner_id)))
     LEFT JOIN client_groups cg ON (((cgpo.client_group_id = cg.id) AND (cg.status = 'active'::text))))
     LEFT JOIN product_owner_products pop ON ((po.id = pop.product_owner_id)))
     LEFT JOIN client_products cp ON (((pop.product_id = cp.id) AND (cp.status = 'active'::text))))
  WHERE (po.status = 'active'::text)
  GROUP BY po.id, po.firstname, po.surname, po.known_as, po.status, po.created_at;;

-- View: product_value_irr_summary
CREATE OR REPLACE VIEW product_value_irr_summary AS
 SELECT cp.id AS product_id,
    cp.product_name,
    cp.client_id,
    cp.portfolio_id,
    cp.provider_id,
    cp.status,
    cp.start_date,
    cp.end_date,
    COALESCE(pv.total_value, 0.0) AS total_value,
    COALESCE(((pirr.irr_result * pv.total_value) / 100.0), 0.0) AS irr_weighted,
    COALESCE(pirr.irr_result, 0.0) AS irr_result,
    pv.valuation_date AS latest_valuation_date,
    pirr.date AS latest_irr_date
   FROM (((client_products cp
     LEFT JOIN portfolios p ON ((p.id = cp.portfolio_id)))
     LEFT JOIN ( SELECT latest_portfolio_valuations.portfolio_id,
            latest_portfolio_valuations.valuation_date,
            sum(latest_portfolio_valuations.valuation) AS total_value
           FROM latest_portfolio_valuations
          GROUP BY latest_portfolio_valuations.portfolio_id, latest_portfolio_valuations.valuation_date) pv ON ((pv.portfolio_id = cp.portfolio_id)))
     LEFT JOIN latest_portfolio_irr_values pirr ON ((pirr.portfolio_id = cp.portfolio_id)))
  WHERE (cp.status = 'active'::text);;

-- View: products_display_view
CREATE OR REPLACE VIEW products_display_view AS
 SELECT cp.id,
    cp.client_id,
    cp.product_name,
    cp.product_type,
    cp.status,
    cp.start_date,
    cp.end_date,
    cp.provider_id,
    cp.portfolio_id,
    cp.plan_number,
    cp.created_at,
    cg.name AS client_name,
    cg.advisor AS client_advisor,
    cg.type AS client_type,
    ap.name AS provider_name,
    ap.theme_color AS provider_theme_color,
    p.portfolio_name,
    lpv.valuation AS current_value,
    lpv.valuation_date AS current_value_date,
    lpir.irr_result AS current_irr,
    lpir.date AS current_irr_date,
    count(DISTINCT pf.id) AS fund_count,
    sum(pf.amount_invested) AS total_invested,
    count(DISTINCT pop.product_owner_id) AS owner_count,
    string_agg(DISTINCT COALESCE(po.known_as, concat(po.firstname, ' ', po.surname)), ', '::text) AS product_owners,
        CASE
            WHEN (lpir.irr_result > 0.05) THEN 'good'::text
            WHEN (lpir.irr_result > (0)::numeric) THEN 'average'::text
            WHEN (lpir.irr_result < (0)::numeric) THEN 'poor'::text
            ELSE 'unknown'::text
        END AS performance_category,
        CASE
            WHEN ((cp.status = 'active'::text) AND (p.status = 'active'::text)) THEN 'active'::text
            WHEN ((cp.status = 'inactive'::text) OR (p.status = 'inactive'::text)) THEN 'inactive'::text
            ELSE 'unknown'::text
        END AS overall_status
   FROM ((((((((client_products cp
     JOIN client_groups cg ON ((cp.client_id = cg.id)))
     LEFT JOIN available_providers ap ON ((cp.provider_id = ap.id)))
     LEFT JOIN portfolios p ON ((cp.portfolio_id = p.id)))
     LEFT JOIN portfolio_funds pf ON (((p.id = pf.portfolio_id) AND (pf.status = 'active'::text))))
     LEFT JOIN latest_portfolio_valuations lpv ON ((p.id = lpv.portfolio_id)))
     LEFT JOIN latest_portfolio_irr_values lpir ON ((p.id = lpir.portfolio_id)))
     LEFT JOIN product_owner_products pop ON ((cp.id = pop.product_id)))
     LEFT JOIN product_owners po ON (((pop.product_owner_id = po.id) AND (po.status = 'active'::text))))
  WHERE ((cp.status = 'active'::text) AND (cg.status = 'active'::text))
  GROUP BY cp.id, cp.client_id, cp.product_name, cp.product_type, cp.status, cp.start_date, cp.end_date, cp.provider_id, cp.portfolio_id, cp.plan_number, cp.created_at, cg.name, cg.advisor, cg.type, ap.name, ap.theme_color, p.portfolio_name, lpv.valuation, lpv.valuation_date, lpir.irr_result, lpir.date, p.status
  ORDER BY lpv.valuation DESC NULLS LAST, cp.product_name;;

-- View: products_list_view
CREATE OR REPLACE VIEW products_list_view AS
 SELECT cp.id,
    cp.client_id,
    cp.product_name,
    cp.product_type,
    cp.status,
    cp.start_date,
    cp.end_date,
    cp.provider_id,
    cp.portfolio_id,
    cp.plan_number,
    cp.created_at,
    cg.name AS client_name,
    cg.advisor,
    cg.type AS client_type,
    ap.name AS provider_name,
    ap.theme_color AS provider_color,
    p.portfolio_name,
    p.status AS portfolio_status,
    lpv.valuation AS current_value,
    lpv.valuation_date,
    lpir.irr_result AS current_irr,
    lpir.date AS irr_date,
    count(DISTINCT pop.product_owner_id) AS owner_count,
    string_agg(DISTINCT COALESCE(po.known_as, concat(po.firstname, ' ', po.surname)), ', '::text) AS owners,
    cp.fixed_fee_direct,
    cp.fixed_fee_facilitated,
    cp.percentage_fee_facilitated
   FROM (((((((client_products cp
     JOIN client_groups cg ON ((cp.client_id = cg.id)))
     LEFT JOIN available_providers ap ON ((cp.provider_id = ap.id)))
     LEFT JOIN portfolios p ON ((cp.portfolio_id = p.id)))
     LEFT JOIN latest_portfolio_valuations lpv ON ((p.id = lpv.portfolio_id)))
     LEFT JOIN latest_portfolio_irr_values lpir ON ((p.id = lpir.portfolio_id)))
     LEFT JOIN product_owner_products pop ON ((cp.id = pop.product_id)))
     LEFT JOIN product_owners po ON (((pop.product_owner_id = po.id) AND (po.status = 'active'::text))))
  WHERE (cg.status = 'active'::text)
  GROUP BY cp.id, cp.client_id, cp.product_name, cp.product_type, cp.status, cp.start_date, cp.end_date, cp.provider_id, cp.portfolio_id, cp.plan_number, cp.created_at, cg.name, cg.advisor, cg.type, ap.name, ap.theme_color, p.portfolio_name, p.status, lpv.valuation, lpv.valuation_date, lpir.irr_result, lpir.date, cp.fixed_fee_direct, cp.fixed_fee_facilitated, cp.percentage_fee_facilitated;;

-- View: provider_distribution_fast
CREATE OR REPLACE VIEW provider_distribution_fast AS
 SELECT ap.id,
    ap.name,
    COALESCE(sum(lpfv.valuation), sum(pf.amount_invested), (0)::numeric) AS amount,
    count(DISTINCT cp.id) AS product_count
   FROM ((((available_providers ap
     LEFT JOIN client_products cp ON (((ap.id = cp.provider_id) AND (cp.status = 'active'::text))))
     LEFT JOIN portfolios p ON (((cp.portfolio_id = p.id) AND (p.status = 'active'::text))))
     LEFT JOIN portfolio_funds pf ON (((p.id = pf.portfolio_id) AND (pf.status = 'active'::text))))
     LEFT JOIN latest_portfolio_fund_valuations lpfv ON ((pf.id = lpfv.portfolio_fund_id)))
  GROUP BY ap.id, ap.name
 HAVING (COALESCE(sum(lpfv.valuation), sum(pf.amount_invested), (0)::numeric) > (0)::numeric)
  ORDER BY COALESCE(sum(lpfv.valuation), sum(pf.amount_invested), (0)::numeric) DESC;;

-- View: provider_revenue_breakdown
CREATE OR REPLACE VIEW provider_revenue_breakdown AS
 SELECT ap.id,
    ap.name,
    ap.status,
    ap.theme_color,
    count(DISTINCT cp.id) AS product_count,
    count(DISTINCT cg.id) AS client_count,
    count(DISTINCT p.id) AS portfolio_count,
    sum(lpv.valuation) AS total_value,
    avg(lpir.irr_result) AS avg_irr,
    max(lpv.valuation_date) AS latest_valuation_date,
    min(cp.start_date) AS first_product_date,
    max(cp.start_date) AS latest_product_date
   FROM (((((available_providers ap
     LEFT JOIN client_products cp ON (((ap.id = cp.provider_id) AND (cp.status = 'active'::text))))
     LEFT JOIN client_groups cg ON (((cp.client_id = cg.id) AND (cg.status = 'active'::text))))
     LEFT JOIN portfolios p ON (((cp.portfolio_id = p.id) AND (p.status = 'active'::text))))
     LEFT JOIN latest_portfolio_valuations lpv ON ((p.id = lpv.portfolio_id)))
     LEFT JOIN latest_portfolio_irr_values lpir ON ((p.id = lpir.portfolio_id)))
  WHERE (ap.status = 'active'::text)
  GROUP BY ap.id, ap.name, ap.status, ap.theme_color
  ORDER BY (sum(lpv.valuation)) DESC NULLS LAST;;

-- View: revenue_analytics_optimized
CREATE OR REPLACE VIEW revenue_analytics_optimized AS
 SELECT cg.id AS client_id,
    cg.name AS client_name,
    cg.status AS client_status,
    cp.id AS product_id,
    cp.fixed_fee_direct,
    cp.fixed_fee_facilitated,
    cp.percentage_fee_facilitated,
    cp.portfolio_id,
    pf.id AS portfolio_fund_id,
    lfv.valuation AS fund_valuation,
        CASE
            WHEN (lfv.valuation IS NOT NULL) THEN true
            ELSE false
        END AS has_valuation,
    sum(COALESCE(lfv.valuation, (0)::numeric)) OVER (PARTITION BY cp.id) AS product_total_fum,
    count(pf.id) OVER (PARTITION BY cp.id) AS product_fund_count,
    count(lfv.valuation) OVER (PARTITION BY cp.id) AS product_valued_fund_count
   FROM (((client_groups cg
     LEFT JOIN client_products cp ON (((cg.id = cp.client_id) AND (cp.status = 'active'::text))))
     LEFT JOIN portfolio_funds pf ON (((cp.portfolio_id = pf.portfolio_id) AND (pf.status = 'active'::text))))
     LEFT JOIN latest_portfolio_fund_valuations lfv ON ((pf.id = lfv.portfolio_fund_id)))
  WHERE (cg.status = ANY (ARRAY['active'::text, 'dormant'::text]));;

-- View: template_generation_weighted_risk
CREATE OR REPLACE VIEW template_generation_weighted_risk AS
 SELECT tpg.id,
    tpg.available_portfolio_id,
    tpg.version_number,
    tpg.generation_name,
    tpg.description,
    tpg.status,
    tpg.created_at,
    ap.name AS portfolio_name,
    count(apf.id) AS fund_count,
    avg(af.risk_factor) AS avg_risk_factor,
    (sum((apf.target_weighting * (af.risk_factor)::numeric)) / NULLIF(sum(apf.target_weighting), (0)::numeric)) AS weighted_risk_factor,
    sum(apf.target_weighting) AS total_weighting,
    string_agg((af.fund_name)::text, ', '::text) AS fund_names
   FROM (((template_portfolio_generations tpg
     JOIN available_portfolios ap ON ((tpg.available_portfolio_id = ap.id)))
     LEFT JOIN available_portfolio_funds apf ON ((tpg.id = apf.template_portfolio_generation_id)))
     LEFT JOIN available_funds af ON (((apf.fund_id = af.id) AND (af.status = 'active'::text))))
  WHERE (tpg.status = 'active'::text)
  GROUP BY tpg.id, tpg.available_portfolio_id, tpg.version_number, tpg.generation_name, tpg.description, tpg.status, tpg.created_at, ap.name;;


-- ============================================================================
-- 4. FUNCTIONS AND PROCEDURES
-- ============================================================================

-- FUNCTION: calculate_adhoc_portfolio_valuation
-- Arguments: portfolio_id_param bigint
-- Returns: TABLE(portfolio_id bigint, portfolio_name text, total_valuation numeric, valuation_date date, fund_count integer, fund_details json)
CREATE OR REPLACE FUNCTION public.calculate_adhoc_portfolio_valuation(portfolio_id_param bigint)
 RETURNS TABLE(portfolio_id bigint, portfolio_name text, total_valuation numeric, valuation_date date, fund_count integer, fund_details json)
 LANGUAGE plpgsql
AS $function$

DECLARE

    portfolio_record RECORD;

    fund_record RECORD;

    fund_details_array json[] := '{}';

    total_val numeric := 0;

    latest_date date;

BEGIN

    -- Get portfolio information

    SELECT p.id, p.portfolio_name INTO portfolio_record

    FROM portfolios p 

    WHERE p.id = portfolio_id_param AND p.status = 'active';

    

    IF NOT FOUND THEN

        RETURN;

    END IF;

    

    -- Calculate total valuation and collect fund details

    FOR fund_record IN

        SELECT 

            pf.id as portfolio_fund_id,

            af.fund_name,

            af.isin_number,

            pf.target_weighting,

            pf.amount_invested,

            COALESCE(lpfv.valuation, pf.amount_invested) as current_valuation,

            COALESCE(lpfv.valuation_date, CURRENT_DATE) as valuation_date,

            lpfir.irr_result

        FROM portfolio_funds pf

        JOIN available_funds af ON pf.available_funds_id = af.id

        LEFT JOIN latest_portfolio_fund_valuations lpfv ON pf.id = lpfv.portfolio_fund_id

        LEFT JOIN latest_portfolio_fund_irr_values lpfir ON pf.id = lpfir.fund_id

        WHERE pf.portfolio_id = portfolio_id_param 

            AND pf.status = 'active' 

            AND af.status = 'active'

    LOOP

        -- Add to total valuation

        total_val := total_val + COALESCE(fund_record.current_valuation, 0);

        

        -- Track latest valuation date

        IF latest_date IS NULL OR fund_record.valuation_date > latest_date THEN

            latest_date := fund_record.valuation_date;

        END IF;

        

        -- Collect fund details

        fund_details_array := fund_details_array || json_build_object(

            'fund_name', fund_record.fund_name,

            'isin_number', fund_record.isin_number,

            'target_weighting', fund_record.target_weighting,

            'amount_invested', fund_record.amount_invested,

            'current_valuation', fund_record.current_valuation,

            'valuation_date', fund_record.valuation_date,

            'irr_result', fund_record.irr_result

        );

    END LOOP;

    

    -- Return the calculated result

    RETURN QUERY SELECT 

        portfolio_record.id,

        portfolio_record.portfolio_name,

        total_val,

        COALESCE(latest_date, CURRENT_DATE),

        array_length(fund_details_array, 1),

        array_to_json(fund_details_array);

END;

$function$
;

-- FUNCTION: global_search_entities
-- Arguments: search_term text
-- Returns: TABLE(entity_type text, entity_id bigint, entity_name text, entity_description text, relevance_score integer)
-- 
-- Note: Function includes ALL products regardless of status (active/inactive).
-- Inactive products are marked with "(LAPSED)" in the description.
-- This allows users to search and find both active and lapsed products.
CREATE OR REPLACE FUNCTION public.global_search_entities(search_term text)
 RETURNS TABLE(entity_type text, entity_id bigint, entity_name text, entity_description text, relevance_score integer)
 LANGUAGE plpgsql
AS $function$

BEGIN

    RETURN QUERY

    -- Search in client groups

    SELECT 

        'client_group'::text as entity_type,

        cg.id as entity_id,

        cg.name as entity_name,

        CONCAT('Client: ', cg.name, ' (', cg.type, ') - Advisor: ', COALESCE(cg.advisor, 'None')) as entity_description,

        CASE 

            WHEN LOWER(cg.name) = LOWER(search_term) THEN 100

            WHEN LOWER(cg.name) LIKE LOWER(search_term || '%') THEN 90

            WHEN LOWER(cg.name) LIKE LOWER('%' || search_term || '%') THEN 80

            WHEN LOWER(cg.advisor) LIKE LOWER('%' || search_term || '%') THEN 70

            ELSE 60

        END as relevance_score

    FROM client_groups cg

    WHERE cg.status = 'active'

        AND (

            LOWER(cg.name) LIKE LOWER('%' || search_term || '%') OR

            LOWER(cg.advisor) LIKE LOWER('%' || search_term || '%') OR

            LOWER(cg.type) LIKE LOWER('%' || search_term || '%')

        )



    UNION ALL



    -- Search in product owners

    SELECT 

        'product_owner'::text as entity_type,

        po.id as entity_id,

        COALESCE(po.known_as, CONCAT(po.firstname, ' ', po.surname)) as entity_name,

        CONCAT('Product Owner: ', COALESCE(po.known_as, CONCAT(po.firstname, ' ', po.surname))) as entity_description,

        CASE 

            WHEN LOWER(COALESCE(po.known_as, CONCAT(po.firstname, ' ', po.surname))) = LOWER(search_term) THEN 100

            WHEN LOWER(COALESCE(po.known_as, CONCAT(po.firstname, ' ', po.surname))) LIKE LOWER(search_term || '%') THEN 90

            WHEN LOWER(po.firstname) LIKE LOWER('%' || search_term || '%') THEN 80

            WHEN LOWER(po.surname) LIKE LOWER('%' || search_term || '%') THEN 80

            WHEN LOWER(po.known_as) LIKE LOWER('%' || search_term || '%') THEN 85

            ELSE 60

        END as relevance_score

    FROM product_owners po

    WHERE po.status = 'active'

        AND (

            LOWER(po.firstname) LIKE LOWER('%' || search_term || '%') OR

            LOWER(po.surname) LIKE LOWER('%' || search_term || '%') OR

            LOWER(po.known_as) LIKE LOWER('%' || search_term || '%')

        )



    UNION ALL



    -- Search in client products

    SELECT 

        'client_product'::text as entity_type,

        cp.id as entity_id,

        cp.product_name as entity_name,

        CONCAT('Product: ', cp.product_name, ' - Client: ', cg.name, ' - Provider: ', ap.name, 
               CASE WHEN cp.status = 'inactive' THEN ' (LAPSED)' ELSE '' END) as entity_description,

        CASE 

            WHEN LOWER(cp.product_name) = LOWER(search_term) THEN 100

            WHEN LOWER(cp.product_name) LIKE LOWER(search_term || '%') THEN 90

            WHEN LOWER(cp.product_name) LIKE LOWER('%' || search_term || '%') THEN 80

            WHEN LOWER(cp.plan_number) LIKE LOWER('%' || search_term || '%') THEN 85

            WHEN LOWER(cp.product_type) LIKE LOWER('%' || search_term || '%') THEN 75

            ELSE 60

        END as relevance_score

    FROM client_products cp

    JOIN client_groups cg ON cp.client_id = cg.id

    JOIN available_providers ap ON cp.provider_id = ap.id

    WHERE cg.status = 'active'

        AND (

            LOWER(cp.product_name) LIKE LOWER('%' || search_term || '%') OR

            LOWER(cp.product_type) LIKE LOWER('%' || search_term || '%') OR

            LOWER(cp.plan_number) LIKE LOWER('%' || search_term || '%')

        )



    UNION ALL



    -- Search in available funds

    SELECT 

        'fund'::text as entity_type,

        af.id as entity_id,

        af.fund_name as entity_name,

        CONCAT('Fund: ', af.fund_name, ' (', af.isin_number, ') - Risk: ', af.risk_factor) as entity_description,

        CASE 

            WHEN LOWER(af.fund_name) = LOWER(search_term) THEN 100

            WHEN LOWER(af.fund_name) LIKE LOWER(search_term || '%') THEN 90

            WHEN LOWER(af.fund_name) LIKE LOWER('%' || search_term || '%') THEN 80

            WHEN LOWER(af.isin_number) LIKE LOWER('%' || search_term || '%') THEN 95

            ELSE 60

        END as relevance_score

    FROM available_funds af

    WHERE af.status = 'active'

        AND (

            LOWER(af.fund_name) LIKE LOWER('%' || search_term || '%') OR

            LOWER(af.isin_number) LIKE LOWER('%' || search_term || '%')

        )



    UNION ALL



    -- Search in providers

    SELECT 

        'provider'::text as entity_type,

        ap.id as entity_id,

        ap.name as entity_name,

        CONCAT('Provider: ', ap.name) as entity_description,

        CASE 

            WHEN LOWER(ap.name) = LOWER(search_term) THEN 100

            WHEN LOWER(ap.name) LIKE LOWER(search_term || '%') THEN 90

            WHEN LOWER(ap.name) LIKE LOWER('%' || search_term || '%') THEN 80

            ELSE 60

        END as relevance_score

    FROM available_providers ap

    WHERE ap.status = 'active'

        AND LOWER(ap.name) LIKE LOWER('%' || search_term || '%')



    UNION ALL



    -- Search in portfolios

    SELECT 

        'portfolio'::text as entity_type,

        p.id as entity_id,

        p.portfolio_name as entity_name,

        CONCAT('Portfolio: ', p.portfolio_name, ' - Client: ', cg.name) as entity_description,

        CASE 

            WHEN LOWER(p.portfolio_name) = LOWER(search_term) THEN 100

            WHEN LOWER(p.portfolio_name) LIKE LOWER(search_term || '%') THEN 90

            WHEN LOWER(p.portfolio_name) LIKE LOWER('%' || search_term || '%') THEN 80

            ELSE 60

        END as relevance_score

    FROM portfolios p

    JOIN client_products cp ON p.id = cp.portfolio_id

    JOIN client_groups cg ON cp.client_id = cg.id

    WHERE p.status = 'active' AND cp.status = 'active' AND cg.status = 'active'

        AND LOWER(p.portfolio_name) LIKE LOWER('%' || search_term || '%')



    ORDER BY relevance_score DESC, entity_name

    LIMIT 50;

END;

$function$
;


-- ============================================================================
-- 5. INDEXES
-- ============================================================================

-- Indexes for table: authentication
CREATE UNIQUE INDEX authentication_pkey ON public.authentication USING btree (auth_id);
CREATE INDEX idx_authentication_profiles_id ON public.authentication USING btree (profiles_id);
-- Indexes for table: available_funds
CREATE UNIQUE INDEX available_funds_pkey ON public.available_funds USING btree (id);
CREATE INDEX idx_available_funds_isin ON public.available_funds USING btree (isin_number);
CREATE INDEX idx_available_funds_status ON public.available_funds USING btree (status);
-- Indexes for table: available_portfolio_funds
CREATE UNIQUE INDEX available_portfolio_funds_pkey ON public.available_portfolio_funds USING btree (id);
-- Indexes for table: available_portfolios
CREATE UNIQUE INDEX available_portfolios_pkey ON public.available_portfolios USING btree (id);
-- Indexes for table: available_providers
CREATE UNIQUE INDEX available_providers_pkey ON public.available_providers USING btree (id);
CREATE INDEX idx_available_providers_status ON public.available_providers USING btree (status);
-- Indexes for table: client_group_product_owners
CREATE UNIQUE INDEX client_group_product_owners_pkey ON public.client_group_product_owners USING btree (id);
-- Indexes for table: client_groups
CREATE UNIQUE INDEX client_groups_pkey ON public.client_groups USING btree (id);
CREATE INDEX idx_client_groups_advisor ON public.client_groups USING btree (advisor);
CREATE INDEX idx_client_groups_status ON public.client_groups USING btree (status);
-- Indexes for table: client_products
CREATE UNIQUE INDEX client_products_pkey ON public.client_products USING btree (id);
CREATE INDEX idx_client_products_client_id ON public.client_products USING btree (client_id);
CREATE INDEX idx_client_products_portfolio_id ON public.client_products USING btree (portfolio_id);
CREATE INDEX idx_client_products_provider_id ON public.client_products USING btree (provider_id);
CREATE INDEX idx_client_products_status ON public.client_products USING btree (status);
-- Indexes for table: holding_activity_log
CREATE UNIQUE INDEX holding_activity_log_pkey ON public.holding_activity_log USING btree (id);
CREATE INDEX idx_holding_activity_log_portfolio_fund_id ON public.holding_activity_log USING btree (portfolio_fund_id);
CREATE INDEX idx_holding_activity_log_product_id ON public.holding_activity_log USING btree (product_id);
CREATE INDEX idx_holding_activity_log_timestamp ON public.holding_activity_log USING btree (activity_timestamp);
-- Indexes for table: portfolio_fund_irr_values
CREATE INDEX idx_portfolio_fund_irr_values_date ON public.portfolio_fund_irr_values USING btree (date);
CREATE INDEX idx_portfolio_fund_irr_values_fund_id ON public.portfolio_fund_irr_values USING btree (fund_id);
CREATE UNIQUE INDEX portfolio_fund_irr_values_pkey ON public.portfolio_fund_irr_values USING btree (id);
-- Indexes for table: portfolio_fund_valuations
CREATE INDEX idx_portfolio_fund_valuations_date ON public.portfolio_fund_valuations USING btree (valuation_date);
CREATE INDEX idx_portfolio_fund_valuations_fund_id ON public.portfolio_fund_valuations USING btree (portfolio_fund_id);
CREATE UNIQUE INDEX portfolio_fund_valuations_pkey ON public.portfolio_fund_valuations USING btree (id);
-- Indexes for table: portfolio_funds
CREATE INDEX idx_portfolio_funds_portfolio_id ON public.portfolio_funds USING btree (portfolio_id);
CREATE INDEX idx_portfolio_funds_status ON public.portfolio_funds USING btree (status);
CREATE UNIQUE INDEX portfolio_funds_pkey ON public.portfolio_funds USING btree (id);
-- Indexes for table: portfolio_irr_values
CREATE INDEX idx_portfolio_irr_values_date ON public.portfolio_irr_values USING btree (date);
CREATE INDEX idx_portfolio_irr_values_portfolio_id ON public.portfolio_irr_values USING btree (portfolio_id);
CREATE UNIQUE INDEX portfolio_irr_values_pkey ON public.portfolio_irr_values USING btree (id);
-- Indexes for table: portfolio_valuations
CREATE INDEX idx_portfolio_valuations_date ON public.portfolio_valuations USING btree (valuation_date);
CREATE INDEX idx_portfolio_valuations_portfolio_id ON public.portfolio_valuations USING btree (portfolio_id);
CREATE UNIQUE INDEX portfolio_valuations_pkey ON public.portfolio_valuations USING btree (id);
-- Indexes for table: portfolios
CREATE INDEX idx_portfolios_status ON public.portfolios USING btree (status);
CREATE INDEX idx_portfolios_template_generation_id ON public.portfolios USING btree (template_generation_id);
CREATE UNIQUE INDEX portfolios_pkey ON public.portfolios USING btree (id);
-- Indexes for table: product_owner_products
CREATE UNIQUE INDEX product_owner_products_pkey ON public.product_owner_products USING btree (id);
-- Indexes for table: product_owners
CREATE UNIQUE INDEX product_owners_pkey ON public.product_owners USING btree (id);
-- Indexes for table: profiles
CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);
-- Indexes for table: provider_switch_log
CREATE UNIQUE INDEX provider_switch_log_pkey ON public.provider_switch_log USING btree (id);
-- Indexes for table: session
CREATE INDEX idx_session_expires_at ON public.session USING btree (expires_at);
CREATE INDEX idx_session_profiles_id ON public.session USING btree (profiles_id);
CREATE UNIQUE INDEX session_pkey ON public.session USING btree (session_id);
-- Indexes for table: template_portfolio_generations
CREATE UNIQUE INDEX template_portfolio_generations_pkey ON public.template_portfolio_generations USING btree (id);
-- Indexes for table: user_page_presence
CREATE INDEX idx_user_page_presence_last_seen ON public.user_page_presence USING btree (last_seen);
CREATE INDEX idx_user_page_presence_page ON public.user_page_presence USING btree (page_identifier);
CREATE INDEX idx_user_page_presence_user_page ON public.user_page_presence USING btree (user_id, page_identifier);
CREATE UNIQUE INDEX user_page_presence_pkey ON public.user_page_presence USING btree (id);
CREATE UNIQUE INDEX user_page_presence_user_id_page_identifier_key ON public.user_page_presence USING btree (user_id, page_identifier);


-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================


-- ============================================================================
-- 7. CONSTRAINTS SUMMARY
-- ============================================================================

-- Constraints for table: authentication
--   PRIMARY KEY:
--     authentication_pkey: auth_id
--   FOREIGN KEY:
--     authentication_profiles_id_fkey: profiles_id -> profiles.id
--   CHECK:
--     2200_16419_1_not_null: auth_id IS NOT NULL
--     2200_16419_2_not_null: created_at IS NOT NULL

-- Constraints for table: available_funds
--   PRIMARY KEY:
--     available_funds_pkey: id
--   CHECK:
--     2200_16467_1_not_null: id IS NOT NULL
--     2200_16467_7_not_null: created_at IS NOT NULL

-- Constraints for table: available_portfolio_funds
--   PRIMARY KEY:
--     available_portfolio_funds_pkey: id
--   FOREIGN KEY:
--     available_portfolio_funds_fund_id_fkey: fund_id -> available_funds.id
--     available_portfolio_funds_template_portfolio_generation_id_fkey: template_portfolio_generation_id -> template_portfolio_generations.id
--   CHECK:
--     2200_16505_1_not_null: id IS NOT NULL
--     2200_16505_5_not_null: created_at IS NOT NULL

-- Constraints for table: available_portfolios
--   PRIMARY KEY:
--     available_portfolios_pkey: id
--   CHECK:
--     2200_16479_1_not_null: id IS NOT NULL
--     2200_16479_2_not_null: created_at IS NOT NULL

-- Constraints for table: available_providers
--   PRIMARY KEY:
--     available_providers_pkey: id
--   CHECK:
--     2200_16435_1_not_null: id IS NOT NULL
--     2200_16435_3_not_null: status IS NOT NULL
--     2200_16435_4_not_null: created_at IS NOT NULL

-- Constraints for table: client_group_product_owners
--   PRIMARY KEY:
--     client_group_product_owners_pkey: id
--   FOREIGN KEY:
--     client_group_product_owners_client_group_id_fkey: client_group_id -> client_groups.id
--     client_group_product_owners_product_owner_id_fkey: product_owner_id -> product_owners.id
--   CHECK:
--     2200_16488_1_not_null: id IS NOT NULL
--     2200_16488_4_not_null: created_at IS NOT NULL

-- Constraints for table: client_groups
--   PRIMARY KEY:
--     client_groups_pkey: id
--   CHECK:
--     2200_16445_1_not_null: id IS NOT NULL
--     2200_16445_4_not_null: created_at IS NOT NULL

-- Constraints for table: client_products
--   PRIMARY KEY:
--     client_products_pkey: id
--   FOREIGN KEY:
--     client_products_client_id_fkey: client_id -> client_groups.id
--     client_products_portfolio_id_fkey: portfolio_id -> portfolios.id
--     client_products_provider_id_fkey: provider_id -> available_providers.id
--   CHECK:
--     2200_16522_11_not_null: created_at IS NOT NULL
--     2200_16522_1_not_null: id IS NOT NULL

-- Constraints for table: holding_activity_log
--   PRIMARY KEY:
--     holding_activity_log_pkey: id
--   FOREIGN KEY:
--     holding_activity_log_portfolio_fund_id_fkey: portfolio_fund_id -> portfolio_funds.id
--     holding_activity_log_product_id_fkey: product_id -> client_products.id
--   CHECK:
--     2200_16577_1_not_null: id IS NOT NULL
--     2200_16577_6_not_null: activity_timestamp IS NOT NULL
--     2200_16577_7_not_null: created_at IS NOT NULL

-- Constraints for table: portfolio_fund_irr_values
--   PRIMARY KEY:
--     portfolio_fund_irr_values_pkey: id
--   FOREIGN KEY:
--     portfolio_fund_irr_values_fund_id_fkey: fund_id -> portfolio_funds.id
--   CHECK:
--     2200_16563_1_not_null: id IS NOT NULL
--     2200_16563_5_not_null: created_at IS NOT NULL

-- Constraints for table: portfolio_fund_valuations
--   PRIMARY KEY:
--     portfolio_fund_valuations_pkey: id
--   FOREIGN KEY:
--     portfolio_fund_valuations_portfolio_fund_id_fkey: portfolio_fund_id -> portfolio_funds.id
--   CHECK:
--     2200_16549_1_not_null: id IS NOT NULL
--     2200_16549_5_not_null: created_at IS NOT NULL

-- Constraints for table: portfolio_funds
--   PRIMARY KEY:
--     portfolio_funds_pkey: id
--   FOREIGN KEY:
--     portfolio_funds_available_funds_id_fkey: available_funds_id -> available_funds.id
--     portfolio_funds_portfolio_id_fkey: portfolio_id -> portfolios.id
--   CHECK:
--     2200_16539_1_not_null: id IS NOT NULL
--     2200_16539_9_not_null: created_at IS NOT NULL

-- Constraints for table: portfolio_irr_values
--   PRIMARY KEY:
--     portfolio_irr_values_pkey: id
--   FOREIGN KEY:
--     portfolio_irr_values_portfolio_id_fkey: portfolio_id -> portfolios.id
--   CHECK:
--     2200_16570_1_not_null: id IS NOT NULL
--     2200_16570_5_not_null: created_at IS NOT NULL

-- Constraints for table: portfolio_valuations
--   PRIMARY KEY:
--     portfolio_valuations_pkey: id
--   FOREIGN KEY:
--     portfolio_valuations_portfolio_id_fkey: portfolio_id -> portfolios.id
--   CHECK:
--     2200_16556_1_not_null: id IS NOT NULL
--     2200_16556_5_not_null: created_at IS NOT NULL

-- Constraints for table: portfolios
--   PRIMARY KEY:
--     portfolios_pkey: id
--   FOREIGN KEY:
--     portfolios_template_generation_id_fkey: template_generation_id -> template_portfolio_generations.id
--   CHECK:
--     2200_16512_1_not_null: id IS NOT NULL
--     2200_16512_7_not_null: created_at IS NOT NULL

-- Constraints for table: product_owner_products
--   PRIMARY KEY:
--     product_owner_products_pkey: id
--   FOREIGN KEY:
--     product_owner_products_product_id_fkey: product_id -> client_products.id
--     product_owner_products_product_owner_id_fkey: product_owner_id -> product_owners.id
--   CHECK:
--     2200_16532_1_not_null: id IS NOT NULL
--     2200_16532_4_not_null: created_at IS NOT NULL

-- Constraints for table: product_owners
--   PRIMARY KEY:
--     product_owners_pkey: id
--   CHECK:
--     2200_16456_1_not_null: id IS NOT NULL
--     2200_16456_2_not_null: created_at IS NOT NULL

-- Constraints for table: profiles
--   PRIMARY KEY:
--     profiles_pkey: id
--   CHECK:
--     2200_16407_1_not_null: id IS NOT NULL
--     2200_16407_2_not_null: created_at IS NOT NULL

-- Constraints for table: provider_switch_log
--   PRIMARY KEY:
--     provider_switch_log_pkey: id
--   FOREIGN KEY:
--     provider_switch_log_client_product_id_fkey: client_product_id -> client_products.id
--     provider_switch_log_new_provider_id_fkey: new_provider_id -> available_providers.id
--     provider_switch_log_previous_provider_id_fkey: previous_provider_id -> available_providers.id
--   CHECK:
--     2200_16587_1_not_null: id IS NOT NULL
--     2200_16587_6_not_null: created_at IS NOT NULL

-- Constraints for table: session
--   PRIMARY KEY:
--     session_pkey: session_id
--   FOREIGN KEY:
--     session_profiles_id_fkey: profiles_id -> profiles.id
--   CHECK:
--     2200_16427_1_not_null: session_id IS NOT NULL

-- Constraints for table: template_portfolio_generations
--   PRIMARY KEY:
--     template_portfolio_generations_pkey: id
--   FOREIGN KEY:
--     template_portfolio_generations_available_portfolio_id_fkey: available_portfolio_id -> available_portfolios.id
--   CHECK:
--     2200_16495_1_not_null: id IS NOT NULL
--     2200_16495_7_not_null: created_at IS NOT NULL

-- Constraints for table: user_page_presence
--   PRIMARY KEY:
--     user_page_presence_pkey: id
--   FOREIGN KEY:
--     user_page_presence_user_id_fkey: user_id -> profiles.id
--   UNIQUE:
--     user_page_presence_user_id_page_identifier_key: user_id
--     user_page_presence_user_id_page_identifier_key: page_identifier
--     user_page_presence_user_id_page_identifier_key: user_id
--     user_page_presence_user_id_page_identifier_key: page_identifier
--   CHECK:
--     2200_16862_1_not_null: id IS NOT NULL
--     2200_16862_2_not_null: user_id IS NOT NULL
--     2200_16862_3_not_null: page_identifier IS NOT NULL


-- ============================================================================
-- DATABASE STATISTICS SUMMARY
-- ============================================================================
-- Total Tables: 22
-- Total Views: 24
-- Total Functions/Procedures: 2
-- Total Indexes: 53
-- Total Triggers: 0
-- Total Sequences: 0
-- ============================================================================
