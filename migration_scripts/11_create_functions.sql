-- =========================================================
-- Kingston's Portal - Create Database Functions
-- This script creates the functions needed for search and calculations
-- =========================================================

-- =========================================================
-- Global Search Function
-- =========================================================

CREATE OR REPLACE FUNCTION public.global_search_entities(search_term text)
RETURNS TABLE(
    entity_type text,
    entity_id bigint,
    entity_name text,
    entity_description text,
    relevance_score integer
) 
LANGUAGE plpgsql
AS $$
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
        CONCAT('Product: ', cp.product_name, ' - Client: ', cg.name, ' - Provider: ', ap.name) as entity_description,
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
    WHERE cp.status = 'active' AND cg.status = 'active'
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
$$;

SELECT 'Created global_search_entities function' as status;

-- =========================================================
-- Portfolio Valuation Calculation Function
-- =========================================================

CREATE OR REPLACE FUNCTION public.calculate_adhoc_portfolio_valuation(portfolio_id_param BIGINT)
RETURNS TABLE(
    portfolio_id bigint,
    portfolio_name text,
    total_valuation numeric,
    valuation_date date,
    fund_count integer,
    fund_details json
)
LANGUAGE plpgsql
AS $$
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
$$;

SELECT 'Created calculate_adhoc_portfolio_valuation function' as status;

-- =========================================================
-- Client Groups Summary View (Additional Helper)
-- =========================================================

CREATE OR REPLACE VIEW public.client_groups_summary AS
SELECT 
    cg.id,
    cg.name,
    cg.advisor,
    cg.type,
    cg.status,
    cg.created_at,
    COUNT(DISTINCT cp.id) as total_products,
    COUNT(DISTINCT cp.id) FILTER (WHERE cp.status = 'active') as active_products,
    COUNT(DISTINCT po.id) as product_owners_count,
    SUM(COALESCE(lpv.valuation, 0)) as total_value,
    AVG(lpir.irr_result) as avg_irr,
    MAX(lpv.valuation_date) as latest_valuation_date,
    STRING_AGG(DISTINCT ap.name, ', ') as providers_used
FROM client_groups cg
LEFT JOIN client_products cp ON cg.id = cp.client_id
LEFT JOIN client_group_product_owners cgpo ON cg.id = cgpo.client_group_id
LEFT JOIN product_owners po ON cgpo.product_owner_id = po.id AND po.status = 'active'
LEFT JOIN available_providers ap ON cp.provider_id = ap.id
LEFT JOIN portfolios p ON cp.portfolio_id = p.id AND p.status = 'active'
LEFT JOIN latest_portfolio_valuations lpv ON p.id = lpv.portfolio_id
LEFT JOIN latest_portfolio_irr_values lpir ON p.id = lpir.portfolio_id
WHERE cg.status = 'active'
GROUP BY cg.id, cg.name, cg.advisor, cg.type, cg.status, cg.created_at
ORDER BY total_value DESC NULLS LAST, cg.name;

SELECT 'Created client_groups_summary view' as status;

-- =========================================================
-- Revenue Analytics Optimized View
-- =========================================================

CREATE OR REPLACE VIEW public.revenue_analytics_optimized AS
WITH provider_metrics AS (
    SELECT 
        ap.id as provider_id,
        ap.name as provider_name,
        ap.theme_color,
        COUNT(DISTINCT cp.id) as product_count,
        COUNT(DISTINCT cg.id) as client_count,
        SUM(COALESCE(lpv.valuation, 0)) as total_value,
        AVG(lpir.irr_result) as avg_irr
    FROM available_providers ap
    LEFT JOIN client_products cp ON ap.id = cp.provider_id AND cp.status = 'active'
    LEFT JOIN client_groups cg ON cp.client_id = cg.id AND cg.status = 'active'
    LEFT JOIN portfolios p ON cp.portfolio_id = p.id AND p.status = 'active'
    LEFT JOIN latest_portfolio_valuations lpv ON p.id = lpv.portfolio_id
    LEFT JOIN latest_portfolio_irr_values lpir ON p.id = lpir.portfolio_id
    WHERE ap.status = 'active'
    GROUP BY ap.id, ap.name, ap.theme_color
),
company_totals AS (
    SELECT 
        SUM(total_value) as company_total_value,
        SUM(product_count) as company_total_products,
        SUM(client_count) as company_total_clients,
        AVG(avg_irr) as company_avg_irr
    FROM provider_metrics
)
SELECT 
    pm.provider_id,
    pm.provider_name,
    pm.theme_color,
    pm.product_count,
    pm.client_count,
    pm.total_value,
    pm.avg_irr,
    CASE 
        WHEN ct.company_total_value > 0 THEN 
            ROUND((pm.total_value / ct.company_total_value * 100), 2)
        ELSE 0 
    END as percentage_of_total,
    ct.company_total_value,
    ct.company_total_products,
    ct.company_total_clients,
    ct.company_avg_irr
FROM provider_metrics pm
CROSS JOIN company_totals ct
ORDER BY pm.total_value DESC NULLS LAST;

SELECT 'Created revenue_analytics_optimized view' as status;

-- =========================================================
-- Products Display View (Enhanced)
-- =========================================================

CREATE OR REPLACE VIEW public.products_display_view AS
SELECT 
    cp.id,
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
    cg.name as client_name,
    cg.advisor as client_advisor,
    cg.type as client_type,
    ap.name as provider_name,
    ap.theme_color as provider_theme_color,
    p.portfolio_name,
    lpv.valuation as current_value,
    lpv.valuation_date as current_value_date,
    lpir.irr_result as current_irr,
    lpir.date as current_irr_date,
    COUNT(DISTINCT pf.id) as fund_count,
    SUM(pf.amount_invested) as total_invested,
    COUNT(DISTINCT pop.product_owner_id) as owner_count,
    STRING_AGG(
        DISTINCT COALESCE(po.known_as, CONCAT(po.firstname, ' ', po.surname)), 
        ', '
    ) as product_owners,
    -- Performance indicators
    CASE 
        WHEN lpir.irr_result > 0.05 THEN 'good'
        WHEN lpir.irr_result > 0 THEN 'average'
        WHEN lpir.irr_result < 0 THEN 'poor'
        ELSE 'unknown'
    END as performance_category,
    -- Status indicators
    CASE 
        WHEN cp.status = 'active' AND p.status = 'active' THEN 'active'
        WHEN cp.status = 'inactive' OR p.status = 'inactive' THEN 'inactive'
        ELSE 'unknown'
    END as overall_status
FROM client_products cp
JOIN client_groups cg ON cp.client_id = cg.id
LEFT JOIN available_providers ap ON cp.provider_id = ap.id
LEFT JOIN portfolios p ON cp.portfolio_id = p.id
LEFT JOIN portfolio_funds pf ON p.id = pf.portfolio_id AND pf.status = 'active'
LEFT JOIN latest_portfolio_valuations lpv ON p.id = lpv.portfolio_id
LEFT JOIN latest_portfolio_irr_values lpir ON p.id = lpir.portfolio_id
LEFT JOIN product_owner_products pop ON cp.id = pop.product_id
LEFT JOIN product_owners po ON pop.product_owner_id = po.id AND po.status = 'active'
WHERE cp.status = 'active' AND cg.status = 'active'
GROUP BY 
    cp.id, cp.client_id, cp.product_name, cp.product_type, cp.status, 
    cp.start_date, cp.end_date, cp.provider_id, cp.portfolio_id, cp.plan_number, cp.created_at,
    cg.name, cg.advisor, cg.type, ap.name, ap.theme_color, p.portfolio_name,
    lpv.valuation, lpv.valuation_date, lpir.irr_result, lpir.date, p.status
ORDER BY lpv.valuation DESC NULLS LAST, cp.product_name;

SELECT 'Created products_display_view view' as status;

-- =========================================================
-- Summary and Verification
-- =========================================================

-- Show function count
SELECT 'Database functions created:' as info;
SELECT COUNT(*) as function_count 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_type = 'FUNCTION'
    AND routine_name IN ('global_search_entities', 'calculate_adhoc_portfolio_valuation');

-- Show total view count
SELECT 'Total database views:' as info;
SELECT COUNT(*) as total_view_count 
FROM information_schema.views 
WHERE table_schema = 'public';

-- Final status
SELECT 'Database structure completed successfully!' as status;
SELECT 'Ready for data migration from Supabase!' as next_step;