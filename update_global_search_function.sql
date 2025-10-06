-- Migration script to update global_search_entities function
-- to include inactive/lapsed products in search results
-- 
-- Issue: Global search was excluding products with status='inactive' (lapsed products)
-- Solution: Remove cp.status filter completely to show all products regardless of status

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

    -- Search in client products (UPDATED: REMOVED cp.status filter to include all products)
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
    -- UPDATED: Removed cp.status filter completely - now shows all products regardless of status
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
        CONCAT('Fund: ', af.fund_name, ' - ISIN: ', COALESCE(af.isin_number, 'N/A'), ' - Risk: ', af.risk_factor) as entity_description,
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

    -- Search in available providers
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

    -- Search in available portfolios
    SELECT 
        'portfolio'::text as entity_type,
        ap.id as entity_id,
        ap.name as entity_name,
        CONCAT('Portfolio Template: ', ap.name) as entity_description,
        CASE 
            WHEN LOWER(ap.name) = LOWER(search_term) THEN 100
            WHEN LOWER(ap.name) LIKE LOWER(search_term || '%') THEN 90
            WHEN LOWER(ap.name) LIKE LOWER('%' || search_term || '%') THEN 80
            ELSE 60
        END as relevance_score
    FROM available_portfolios ap
    WHERE LOWER(ap.name) LIKE LOWER('%' || search_term || '%')

    ORDER BY relevance_score DESC, entity_name ASC
    LIMIT 50;

END;

$function$;

-- Test the updated function
-- SELECT * FROM global_search_entities('test') WHERE entity_type = 'client_product';