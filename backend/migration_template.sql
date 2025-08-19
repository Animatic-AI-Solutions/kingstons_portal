-- Migration Template with Sequence Management
-- Use this template for all future data migrations

-- STEP 1: Your migration logic here
-- INSERT INTO your_table (id, column1, column2) VALUES 
-- (1, 'value1', 'value2'),
-- (2, 'value1', 'value2');

-- STEP 2: ALWAYS update sequences after data insertion
-- This prevents sequence drift issues

DO $$
DECLARE
    table_name TEXT;
    seq_name TEXT;
    max_id INTEGER;
    tables_to_fix TEXT[] := ARRAY[
        'client_products',
        'product_owner_products',
        'client_group_product_owners',
        'portfolios', 
        'portfolio_funds',
        'product_owners',
        'client_groups'
        -- Add any other tables you've inserted data into
    ];
BEGIN
    FOREACH table_name IN ARRAY tables_to_fix
    LOOP
        -- Check if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) THEN
            seq_name := table_name || '_id_seq';
            
            -- Get max ID and update sequence
            EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', table_name) INTO max_id;
            
            IF max_id > 0 THEN
                EXECUTE format('SELECT setval(%L, %s)', seq_name, max_id + 1);
                RAISE NOTICE 'Updated sequence for %: set to %', table_name, max_id + 1;
            END IF;
        END IF;
    END LOOP;
END
$$;