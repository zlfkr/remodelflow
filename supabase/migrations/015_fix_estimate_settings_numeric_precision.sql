-- Fix numeric field overflow in project_estimate_settings
-- 
-- ISSUE: 
-- - tax_rate NUMERIC(5,4) allows max 9.9999 (one digit before decimal)
--   If user enters tax rate as percentage (e.g., 8.25 instead of 0.0825), it overflows
-- - markup_percent NUMERIC(5,2) allows max 999.99% (might be too restrictive)
--
-- SOLUTION:
-- - Increase tax_rate to NUMERIC(6,4): allows 0.0000 to 99.9999 (as decimal, max 99.9999%)
-- - Increase markup_percent to NUMERIC(7,2): allows 0.00 to 99999.99 (max 99999.99%)
-- - discount_amount NUMERIC(10,2) is already sufficient (max $99,999,999.99)

-- Increase precision for tax_rate: Allow up to 99.9999% (as 0.9999 decimal)
-- NUMERIC(6,4) = 2 digits before decimal, 4 after (max 99.9999%)
ALTER TABLE project_estimate_settings 
  ALTER COLUMN tax_rate TYPE NUMERIC(6, 4);

-- Increase precision for markup_percent: Allow very high markups if needed
-- NUMERIC(7,2) = 5 digits before decimal, 2 after (max 99999.99%)
ALTER TABLE project_estimate_settings 
  ALTER COLUMN markup_percent TYPE NUMERIC(7, 2);

-- discount_amount NUMERIC(10,2) is already sufficient (max $99,999,999.99)
-- No change needed
