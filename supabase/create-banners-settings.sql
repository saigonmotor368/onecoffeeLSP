-- Banners Table
CREATE TABLE IF NOT EXISTS public.banners (
  id text primary key,
  title_vi text not null,
  title_en text not null,
  subtitle_vi text,
  subtitle_en text,
  badge_vi text,
  badge_en text,
  image_url text not null,
  link_url text,
  is_active boolean default true,
  sort_order int default 1
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text primary key,
  value jsonb not null
);

-- Row Level Security (RLS)
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view banners" ON public.banners;
CREATE POLICY "Anyone can view banners" ON public.banners FOR SELECT USING (true);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view system settings" ON public.system_settings;
CREATE POLICY "Anyone can view system settings" ON public.system_settings FOR SELECT USING (true);

-- Admin can bypass RLS via service role (already configured by default)
