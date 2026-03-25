-- Fix profiles RLS: allow any authenticated user to read any profile.
-- Previously "profiles_select_own" only let users read their own row,
-- which caused other users' names to appear as "—" in transaction attribution.

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_any" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
