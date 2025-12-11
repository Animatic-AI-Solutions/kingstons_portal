-- Add client_start_date field to client_groups table
-- This field stores the date when the client relationship officially began

-- Add the column (PostgreSQL will skip if it already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'client_groups'
        AND column_name = 'client_start_date'
    ) THEN
        ALTER TABLE client_groups
        ADD COLUMN client_start_date DATE;

        RAISE NOTICE 'Column client_start_date added successfully';
    ELSE
        RAISE NOTICE 'Column client_start_date already exists';
    END IF;
END $$;

-- Add a comment to describe the field
COMMENT ON COLUMN client_groups.client_start_date IS 'The date when the client relationship officially began';

-- Optional: Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'client_groups'
AND column_name = 'client_start_date';
