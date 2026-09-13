-- Run this in Supabase SQL Editor
-- Adds push subscription storage and favorites sync

-- 1. Ensure push_subscriptions table has all needed columns, including older schema.sql installs
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  role text DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  device_info text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS auth_key text;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS role text DEFAULT 'customer';
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS device_info text;
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'push_subscriptions' AND column_name = 'auth'
  ) THEN
    UPDATE public.push_subscriptions SET auth_key = auth WHERE auth_key IS NULL;
    ALTER TABLE public.push_subscriptions ALTER COLUMN auth DROP NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'push_subscriptions' AND column_name = 'is_admin'
  ) THEN
    UPDATE public.push_subscriptions SET role = 'admin' WHERE is_admin = true;
  END IF;
END $$;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Subscriptions contain private push credentials. Only server routes with the
-- service-role key may read/write them; the API authenticates each user.
DROP POLICY IF EXISTS "Anyone can subscribe to push" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Service role can read all subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users manage own push subs" ON public.push_subscriptions;
REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;

-- 2. Add favorite_ids column to profiles for cross-device sync
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorite_ids uuid[] DEFAULT '{}';

-- 3. Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_role ON public.push_subscriptions(role);
