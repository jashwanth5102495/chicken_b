-- ====================================================================
-- Chicken Farms: Clear All Dummy Data
-- Run this script in PostgreSQL (Railway, Supabase, Neon or local)
-- It leaves products and settings intact, but cleans all shops,
-- orders, order_items, payments, ledger entries, and standing orders.
-- ====================================================================

-- 1. Delete dependent order items and ledger
DELETE FROM order_items;
DELETE FROM ledger_entries;
DELETE FROM payments;
DELETE FROM standing_orders;
DELETE FROM orders;

-- 2. Delete all dummy consumer shop accounts
DELETE FROM shops;

-- Notice:
-- You can now go to /admin -> Shops and create real chicken shop accounts
-- with custom User ID and passwords for each shop owner.
