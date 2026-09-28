-- Phase 11 Security Foundation
-- Review policies before enabling in production.

-- Enable RLS on core tables:
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suppliers ENABLE ROW LEVEL SECURITY;

-- Production policies should be customized based on user_profiles roles.
