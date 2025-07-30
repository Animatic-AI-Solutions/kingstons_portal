-- =========================================================
-- Kingston's Portal - Add Foreign Keys and Indexes (Fixed)
-- This script safely adds foreign key constraints and performance indexes
-- =========================================================

-- =========================================================
-- Add Foreign Key Constraints (with IF NOT EXISTS logic)
-- =========================================================

-- Function to safely add foreign key constraints
DO $$
BEGIN
    -- Authentication and Session FKs
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'authentication_profiles_id_fkey' 
                   AND table_name = 'authentication') THEN
        ALTER TABLE public.authentication ADD CONSTRAINT authentication_profiles_id_fkey 
            FOREIGN KEY (profiles_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'session_profiles_id_fkey' 
                   AND table_name = 'session') THEN
        ALTER TABLE public.session ADD CONSTRAINT session_profiles_id_fkey 
            FOREIGN KEY (profiles_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    -- Client and Product Owner relationships
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'client_group_product_owners_client_group_id_fkey' 
                   AND table_name = 'client_group_product_owners') THEN
        ALTER TABLE public.client_group_product_owners ADD CONSTRAINT client_group_product_owners_client_group_id_fkey 
            FOREIGN KEY (client_group_id) REFERENCES public.client_groups(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'client_group_product_owners_product_owner_id_fkey' 
                   AND table_name = 'client_group_product_owners') THEN
        ALTER TABLE public.client_group_product_owners ADD CONSTRAINT client_group_product_owners_product_owner_id_fkey 
            FOREIGN KEY (product_owner_id) REFERENCES public.product_owners(id) ON DELETE CASCADE;
    END IF;

    -- Portfolio template relationships
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'template_portfolio_generations_available_portfolio_id_fkey' 
                   AND table_name = 'template_portfolio_generations') THEN
        ALTER TABLE public.template_portfolio_generations ADD CONSTRAINT template_portfolio_generations_available_portfolio_id_fkey 
            FOREIGN KEY (available_portfolio_id) REFERENCES public.available_portfolios(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'available_portfolio_funds_template_portfolio_generation_id_fkey' 
                   AND table_name = 'available_portfolio_funds') THEN
        ALTER TABLE public.available_portfolio_funds ADD CONSTRAINT available_portfolio_funds_template_portfolio_generation_id_fkey 
            FOREIGN KEY (template_portfolio_generation_id) REFERENCES public.template_portfolio_generations(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'available_portfolio_funds_fund_id_fkey' 
                   AND table_name = 'available_portfolio_funds') THEN
        ALTER TABLE public.available_portfolio_funds ADD CONSTRAINT available_portfolio_funds_fund_id_fkey 
            FOREIGN KEY (fund_id) REFERENCES public.available_funds(id) ON DELETE CASCADE;
    END IF;

    -- Portfolio relationships
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'portfolios_template_generation_id_fkey' 
                   AND table_name = 'portfolios') THEN
        ALTER TABLE public.portfolios ADD CONSTRAINT portfolios_template_generation_id_fkey 
            FOREIGN KEY (template_generation_id) REFERENCES public.template_portfolio_generations(id);
    END IF;

    -- Client product relationships
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'client_products_client_id_fkey' 
                   AND table_name = 'client_products') THEN
        ALTER TABLE public.client_products ADD CONSTRAINT client_products_client_id_fkey 
            FOREIGN KEY (client_id) REFERENCES public.client_groups(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'client_products_provider_id_fkey' 
                   AND table_name = 'client_products') THEN
        ALTER TABLE public.client_products ADD CONSTRAINT client_products_provider_id_fkey 
            FOREIGN KEY (provider_id) REFERENCES public.available_providers(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'client_products_portfolio_id_fkey' 
                   AND table_name = 'client_products') THEN
        ALTER TABLE public.client_products ADD CONSTRAINT client_products_portfolio_id_fkey 
            FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id);
    END IF;

    -- Product ownership relationships
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'product_owner_products_product_owner_id_fkey' 
                   AND table_name = 'product_owner_products') THEN
        ALTER TABLE public.product_owner_products ADD CONSTRAINT product_owner_products_product_owner_id_fkey 
            FOREIGN KEY (product_owner_id) REFERENCES public.product_owners(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'product_owner_products_product_id_fkey' 
                   AND table_name = 'product_owner_products') THEN
        ALTER TABLE public.product_owner_products ADD CONSTRAINT product_owner_products_product_id_fkey 
            FOREIGN KEY (product_id) REFERENCES public.client_products(id) ON DELETE CASCADE;
    END IF;

    -- Portfolio fund relationships
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'portfolio_funds_portfolio_id_fkey' 
                   AND table_name = 'portfolio_funds') THEN
        ALTER TABLE public.portfolio_funds ADD CONSTRAINT portfolio_funds_portfolio_id_fkey 
            FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'portfolio_funds_available_funds_id_fkey' 
                   AND table_name = 'portfolio_funds') THEN
        ALTER TABLE public.portfolio_funds ADD CONSTRAINT portfolio_funds_available_funds_id_fkey 
            FOREIGN KEY (available_funds_id) REFERENCES public.available_funds(id);
    END IF;

    -- Valuation relationships
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'portfolio_fund_valuations_portfolio_fund_id_fkey' 
                   AND table_name = 'portfolio_fund_valuations') THEN
        ALTER TABLE public.portfolio_fund_valuations ADD CONSTRAINT portfolio_fund_valuations_portfolio_fund_id_fkey 
            FOREIGN KEY (portfolio_fund_id) REFERENCES public.portfolio_funds(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'portfolio_valuations_portfolio_id_fkey' 
                   AND table_name = 'portfolio_valuations') THEN
        ALTER TABLE public.portfolio_valuations ADD CONSTRAINT portfolio_valuations_portfolio_id_fkey 
            FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;
    END IF;

    -- IRR relationships
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'portfolio_fund_irr_values_fund_id_fkey' 
                   AND table_name = 'portfolio_fund_irr_values') THEN
        ALTER TABLE public.portfolio_fund_irr_values ADD CONSTRAINT portfolio_fund_irr_values_fund_id_fkey 
            FOREIGN KEY (fund_id) REFERENCES public.portfolio_funds(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'portfolio_irr_values_portfolio_id_fkey' 
                   AND table_name = 'portfolio_irr_values') THEN
        ALTER TABLE public.portfolio_irr_values ADD CONSTRAINT portfolio_irr_values_portfolio_id_fkey 
            FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;
    END IF;

    -- Activity log relationships
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'holding_activity_log_product_id_fkey' 
                   AND table_name = 'holding_activity_log') THEN
        ALTER TABLE public.holding_activity_log ADD CONSTRAINT holding_activity_log_product_id_fkey 
            FOREIGN KEY (product_id) REFERENCES public.client_products(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'holding_activity_log_portfolio_fund_id_fkey' 
                   AND table_name = 'holding_activity_log') THEN
        ALTER TABLE public.holding_activity_log ADD CONSTRAINT holding_activity_log_portfolio_fund_id_fkey 
            FOREIGN KEY (portfolio_fund_id) REFERENCES public.portfolio_funds(id) ON DELETE CASCADE;
    END IF;

    -- Provider switch log relationships
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'provider_switch_log_client_product_id_fkey' 
                   AND table_name = 'provider_switch_log') THEN
        ALTER TABLE public.provider_switch_log ADD CONSTRAINT provider_switch_log_client_product_id_fkey 
            FOREIGN KEY (client_product_id) REFERENCES public.client_products(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'provider_switch_log_previous_provider_id_fkey' 
                   AND table_name = 'provider_switch_log') THEN
        ALTER TABLE public.provider_switch_log ADD CONSTRAINT provider_switch_log_previous_provider_id_fkey 
            FOREIGN KEY (previous_provider_id) REFERENCES public.available_providers(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'provider_switch_log_new_provider_id_fkey' 
                   AND table_name = 'provider_switch_log') THEN
        ALTER TABLE public.provider_switch_log ADD CONSTRAINT provider_switch_log_new_provider_id_fkey 
            FOREIGN KEY (new_provider_id) REFERENCES public.available_providers(id);
    END IF;

END $$;

SELECT 'Foreign key constraints added successfully!' as status;

-- =========================================================
-- Create Performance Indexes (using IF NOT EXISTS)
-- =========================================================

-- Authentication indexes
CREATE INDEX IF NOT EXISTS idx_authentication_profiles_id ON public.authentication(profiles_id);
CREATE INDEX IF NOT EXISTS idx_session_profiles_id ON public.session(profiles_id);
CREATE INDEX IF NOT EXISTS idx_session_expires_at ON public.session(expires_at);

-- Client and product indexes
CREATE INDEX IF NOT EXISTS idx_client_groups_status ON public.client_groups(status);
CREATE INDEX IF NOT EXISTS idx_client_groups_advisor ON public.client_groups(advisor);
CREATE INDEX IF NOT EXISTS idx_client_products_client_id ON public.client_products(client_id);
CREATE INDEX IF NOT EXISTS idx_client_products_status ON public.client_products(status);
CREATE INDEX IF NOT EXISTS idx_client_products_provider_id ON public.client_products(provider_id);
CREATE INDEX IF NOT EXISTS idx_client_products_portfolio_id ON public.client_products(portfolio_id);

-- Portfolio indexes
CREATE INDEX IF NOT EXISTS idx_portfolios_status ON public.portfolios(status);
CREATE INDEX IF NOT EXISTS idx_portfolios_template_generation_id ON public.portfolios(template_generation_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_funds_portfolio_id ON public.portfolio_funds(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_funds_status ON public.portfolio_funds(status);

-- Valuation indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_valuations_portfolio_id ON public.portfolio_valuations(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_valuations_date ON public.portfolio_valuations(valuation_date);
CREATE INDEX IF NOT EXISTS idx_portfolio_fund_valuations_fund_id ON public.portfolio_fund_valuations(portfolio_fund_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_fund_valuations_date ON public.portfolio_fund_valuations(valuation_date);

-- IRR indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_irr_values_portfolio_id ON public.portfolio_irr_values(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_irr_values_date ON public.portfolio_irr_values(date);
CREATE INDEX IF NOT EXISTS idx_portfolio_fund_irr_values_fund_id ON public.portfolio_fund_irr_values(fund_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_fund_irr_values_date ON public.portfolio_fund_irr_values(date);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_holding_activity_log_product_id ON public.holding_activity_log(product_id);
CREATE INDEX IF NOT EXISTS idx_holding_activity_log_portfolio_fund_id ON public.holding_activity_log(portfolio_fund_id);
CREATE INDEX IF NOT EXISTS idx_holding_activity_log_timestamp ON public.holding_activity_log(activity_timestamp);

-- Fund indexes
CREATE INDEX IF NOT EXISTS idx_available_funds_status ON public.available_funds(status);
CREATE INDEX IF NOT EXISTS idx_available_funds_isin ON public.available_funds(isin_number);

-- Provider indexes
CREATE INDEX IF NOT EXISTS idx_available_providers_status ON public.available_providers(status);

SELECT 'Performance indexes created successfully!' as status;

-- =========================================================
-- Summary
-- =========================================================
SELECT 'Database structure completed successfully!' as status;

-- Show foreign key constraints
SELECT 'Foreign key constraints count:' as info;
SELECT COUNT(*) as constraint_count
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public' 
    AND tc.constraint_type = 'FOREIGN KEY';

-- Show indexes count
SELECT 'Performance indexes count:' as info;
SELECT COUNT(*) as index_count
FROM pg_indexes 
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';