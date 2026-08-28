-- =============================================================================
-- Migration: Only let users insert transactions attributed to themselves
--
-- "transactions_insert_any" let any authenticated user insert a row with any
-- user_id, so a token holder (e.g. an MCP client) could record consumption
-- against somebody else's account. The app only ever inserts with the caller's
-- own id, so scoping the WITH CHECK to auth.uid() is a no-op for the web app
-- and enforces attribution in the database instead of only in application code.
--
-- Reads stay global: everyone can still see everyone's transactions.
-- =============================================================================

DROP POLICY IF EXISTS "transactions_insert_any" ON inventory_transactions;

CREATE POLICY "transactions_insert_own" ON inventory_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
