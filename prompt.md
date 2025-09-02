that actually didnt fix it, is it becasue in the products list view it filters only active products//-- public.products_list_view source
>>
>> CREATE OR REPLACE VIEW public.products_list_view
>> AS SELECT cp.id,
>>     cp.client_id,
>>     cp.product_name,
>>     cp.product_type,
>>     cp.status,
>>     cp.start_date,
>>     cp.end_date,
>>     cp.provider_id,
>>     cp.portfolio_id,
>>     cp.plan_number,
>>     cp.created_at,
>>     cg.name AS client_name,
>>     cg.advisor,
>>     cg.type AS client_type,
>>     ap.name AS provider_name,
>>     ap.theme_color AS provider_color,
>>     p.portfolio_name,
>>     p.status AS portfolio_status,
>>     lpv.valuation AS current_value,
>>     lpv.valuation_date,
>>     lpir.irr_result AS current_irr,
>>     lpir.date AS irr_date,
>>     count(DISTINCT pop.product_owner_id) AS owner_count,
>>     string_agg(DISTINCT COALESCE(po.known_as, concat(po.firstname, ' ', po.surname)), ', '::text) AS owners,
>>     cp.fixed_cost,
>>     cp.percentage_fee
>>    FROM client_products cp
>>      JOIN client_groups cg ON cp.client_id = cg.id
>>      LEFT JOIN available_providers ap ON cp.provider_id = ap.id
>>      LEFT JOIN portfolios p ON cp.portfolio_id = p.id
>>      LEFT JOIN latest_portfolio_valuations lpv ON p.id = lpv.portfolio_id
>>      LEFT JOIN latest_portfolio_irr_values lpir ON p.id = lpir.portfolio_id
>>      LEFT JOIN product_owner_products pop ON cp.id = pop.product_id
>>      LEFT JOIN product_owners po ON pop.product_owner_id = po.id AND po.status = 'active'::text
>>   WHERE cg.status = 'active'::text
>>   GROUP BY cp.id, cp.client_id, cp.product_name, cp.product_type, cp.status, cp.start_date, cp.end_date, cp.provider_id, cp.portfolio_id, cp.plan_number, cp.created_at, cg.name, cg.advisor, cg.type, ap.name, ap.theme_color, p.portfolio_name, p.status, lpv.valuation, lpv.valuation_date, lpir.irr_result, lpir.date, cp.fixed_cost, cp.percentage_fee;