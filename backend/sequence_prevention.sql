-- Database-level sequence management
-- Run this in your PostgreSQL database to create automated sequence maintenance

-- Function to fix all sequences
CREATE OR REPLACE FUNCTION fix_all_sequences()
RETURNS TEXT AS $$
DECLARE
    rec RECORD;
    seq_name TEXT;
    max_id INTEGER;
    fixed_count INTEGER := 0;
    result_text TEXT := '';
BEGIN
    -- Get all tables with auto-increment sequences
    FOR rec IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND pg_get_serial_sequence('public.'||tablename, 'id') IS NOT NULL
    LOOP
        seq_name := rec.tablename || '_id_seq';
        
        -- Get max ID from table
        EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', rec.tablename) INTO max_id;
        
        -- Only fix if there are records and sequence might be behind
        IF max_id > 0 THEN
            -- Reset sequence to max_id + 1
            EXECUTE format('SELECT setval(%L, %s)', seq_name, max_id + 1);
            fixed_count := fixed_count + 1;
            result_text := result_text || format('Fixed %s (max_id: %s)', rec.tablename, max_id) || E'\n';
        END IF;
    END LOOP;
    
    IF fixed_count = 0 THEN
        result_text := 'No sequences needed fixing';
    ELSE
        result_text := format('Fixed %s sequences:', fixed_count) || E'\n' || result_text;
    END IF;
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- Function to check sequence health
CREATE OR REPLACE FUNCTION check_sequence_health()
RETURNS TABLE(
    table_name TEXT,
    max_id INTEGER,
    sequence_value INTEGER,
    status TEXT
) AS $$
DECLARE
    rec RECORD;
    seq_name TEXT;
    max_id_val INTEGER;
    seq_val INTEGER;
BEGIN
    -- Get all tables with auto-increment sequences
    FOR rec IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND pg_get_serial_sequence('public.'||tablename, 'id') IS NOT NULL
    LOOP
        seq_name := rec.tablename || '_id_seq';
        table_name := rec.tablename;
        
        -- Get max ID from table
        EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', rec.tablename) INTO max_id_val;
        max_id := max_id_val;
        
        -- Get sequence current value
        EXECUTE format('SELECT last_value FROM %I', seq_name) INTO seq_val;
        sequence_value := seq_val;
        
        -- Determine status
        IF max_id_val = 0 THEN
            status := 'EMPTY';
        ELSIF max_id_val >= seq_val THEN
            status := 'DRIFT';
        ELSE
            status := 'OK';
        END IF;
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM check_sequence_health();
-- SELECT fix_all_sequences();

-- Optional: Create a scheduled job to run this automatically
-- (requires pg_cron extension)
/*
-- Install pg_cron extension first (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule sequence check every hour
SELECT cron.schedule('sequence-maintenance', '0 * * * *', 'SELECT fix_all_sequences();');
*/