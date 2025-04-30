-- Add related_fund column and foreign key constraint
ALTER TABLE public.holding_activity_log
ADD COLUMN related_fund bigint NULL;

-- Add foreign key constraint
ALTER TABLE public.holding_activity_log
ADD CONSTRAINT holding_activity_log_related_fund_fkey FOREIGN KEY (related_fund) REFERENCES portfolio_funds (id);

-- Migrate existing data:
-- 1. For 'SwitchIn' activities, copy source_fund_id to related_fund
UPDATE public.holding_activity_log
SET related_fund = source_fund_id
WHERE activity_type = 'SwitchIn' AND source_fund_id IS NOT NULL;

-- 2. For 'SwitchOut' activities, copy target_fund_id to related_fund
UPDATE public.holding_activity_log
SET related_fund = target_fund_id
WHERE activity_type = 'SwitchOut' AND target_fund_id IS NOT NULL;

-- 3. For legacy 'Switch' activities, copy target_portfolio_fund_id to related_fund
UPDATE public.holding_activity_log
SET related_fund = target_portfolio_fund_id
WHERE activity_type = 'Switch' AND target_portfolio_fund_id IS NOT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_holding_activity_log_related_fund
ON public.holding_activity_log (related_fund)
WHERE related_fund IS NOT NULL; 