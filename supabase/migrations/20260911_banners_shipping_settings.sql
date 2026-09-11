-- ============================================================
-- ONE COFFEE LSP — Migration: Banners, Shipping & System Settings
-- Run this in Supabase SQL Editor: https://hidebmafolacwfzgrrqn.supabase.co
-- ============================================================

-- 1. Add shipping_fee to orders table
alter table public.orders add column if not exists shipping_fee int default 0;

-- 2. Create Banners table for Admin management
create table if not exists public.banners (
  id uuid default uuid_generate_v4() primary key,
  title_vi text not null,
  title_en text not null,
  subtitle_vi text,
  subtitle_en text,
  badge_vi text,
  badge_en text,
  image_url text not null,
  link_url text default '/menu',
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.banners enable row level security;
drop policy if exists "Anyone can view active banners" on public.banners;
create policy "Anyone can view active banners" on public.banners for select using (true);
drop policy if exists "Full access to banners" on public.banners;
create policy "Full access to banners" on public.banners for all using (true);

-- 3. Create System Settings table (Shipping, Employee Discount, etc.)
create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz default now()
);

alter table public.system_settings enable row level security;
drop policy if exists "Anyone can read system settings" on public.system_settings;
create policy "Anyone can read system settings" on public.system_settings for select using (true);
drop policy if exists "Full access to system settings" on public.system_settings;
create policy "Full access to system settings" on public.system_settings for all using (true);

-- 4. Seed default settings
insert into public.system_settings (key, value, description) values
  ('shipping', '{"shipping_fee": 10000, "free_shipping_threshold": 100000, "enabled": true}'::jsonb, 'Phí giao hàng cơ bản 10.000đ, miễn phí ship cho đơn từ 100.000đ'),
  ('employee_discount', '{"discount_percent": 20, "enabled": true}'::jsonb, 'Mặc định giảm 20% cho nhân viên nội bộ LSP')
on conflict (key) do update
set value = excluded.value, updated_at = now();

-- 5. Seed initial banners
insert into public.banners (title_vi, title_en, subtitle_vi, subtitle_en, badge_vi, badge_en, image_url, link_url, sort_order, is_active) values
  ('Cà Phê Kem Muối Long Sơn', 'Long Son Salted Foam Coffee', 'Vị cà phê đậm đà kết hợp lớp foam muối béo mịn trứ danh', 'Rich coffee flavor combined with signature salted cream foam', 'Món Mới', 'New', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=1000&q=80', '/menu/cafe-muoi-long-son', 1, true),
  ('Ưu đãi 20% Nhân viên LSP', '20% Off for LSP Staff', 'Tự động áp dụng giảm 20% cho toàn bộ đơn hàng của nhân viên LSP', 'Automatically applied 20% discount on all orders for internal staff', 'Nội Bộ', 'Exclusive', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1000&q=80', '/menu', 2, true),
  ('Miễn phí giao hàng tại LSP', 'Free Delivery within LSP', 'Freeship tận tay cho mọi đơn hàng từ 100.000đ tại 21 điểm giao', 'Free delivery for orders from 100,000 VND to all 21 factory zones', 'Freeship', 'Free Ship', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=1000&q=80', '/menu', 3, true);
