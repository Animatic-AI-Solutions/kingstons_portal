-- Drop the index first
DROP INDEX IF EXISTS idx_holding_activity_log_related_fund;

-- Drop the foreign key constraint
ALTER TABLE public.holding_activity_log
DROP CONSTRAINT IF EXISTS holding_activity_log_related_fund_fkey;

-- Drop the column
ALTER TABLE public.holding_activity_log
DROP COLUMN IF EXISTS related_fund; 