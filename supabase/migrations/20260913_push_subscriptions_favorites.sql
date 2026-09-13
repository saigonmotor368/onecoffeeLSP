-- Run this in Supabase SQL Editor
-- Adds push subscription storage and favorites sync

-- 1. Ensure push_subscriptions table has all needed columns
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

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including guests) to insert their own subscription
CREATE POLICY IF NOT EXISTS "Anyone can subscribe to push"
  ON public.push_subscriptions FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Users can manage own subscriptions"
  ON public.push_subscriptions FOR ALL USING (
    user_id IS NULL OR user_id = auth.uid()
  );

-- Admins can read all subscriptions (for sending pushes)
CREATE POLICY IF NOT EXISTS "Service role can read all subscriptions"
  ON public.push_subscriptions FOR SELECT USING (true);

-- 2. Add favorite_ids column to profiles for cross-device sync
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorite_ids uuid[] DEFAULT '{}';

-- 3. Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_role ON public.push_subscriptions(role);
