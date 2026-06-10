-- Migration: check_email_registered RPC
-- Allows server-side code to verify whether an email exists in auth.users
-- without exposing the auth schema to the client.

CREATE OR REPLACE FUNCTION check_email_registered(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = lower(p_email)
  );
$$;
