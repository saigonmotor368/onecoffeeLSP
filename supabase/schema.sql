-- ============================================================
-- ONE COFFEE LSP — Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Profiles ─────────────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  phone text unique not null,
  full_name text not null,
  default_delivery_address text,
  language text default 'vi' check (language in ('vi', 'en')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Categories ────────────────────────────────────────────────
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  name_vi text not null,
  name_en text not null,
  slug text unique not null,
  sort_order int default 0,
  icon text,
  is_active boolean default true
);

-- ── Products ──────────────────────────────────────────────────
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  category_id uuid references public.categories on delete cascade not null,
  name_vi text not null,
  name_en text not null,
  description_vi text,
  description_en text,
  price_m int,
  price_l int,
  image_url text,
  is_available boolean default true,
  is_featured boolean default false,
  is_new boolean default false,
  is_recommended boolean default false,
  tags text[] default '{}',
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ── Addons (món gọi thêm) ─────────────────────────────────────
create table public.addons (
  id uuid default uuid_generate_v4() primary key,
  name_vi text not null,
  name_en text not null,
  price int not null default 10,
  is_active boolean default true
);

-- ── Vouchers ──────────────────────────────────────────────────
create table public.vouchers (
  id uuid default uuid_generate_v4() primary key,
  code text unique not null,
  type text not null check (type in ('percent', 'fixed')),
  value int not null,
  min_order_amount int default 0,
  max_discount int,
  usage_limit int,
  used_count int default 0,
  expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ── Orders ────────────────────────────────────────────────────
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  order_number text unique not null,
  user_id uuid references public.profiles on delete set null,
  delivery_address text not null,
  recipient_name text not null,
  recipient_phone text not null,
  total_amount int not null,
  discount_amount int default 0,
  shipping_fee int default 0,
  final_amount int not null,
  payment_method text not null check (payment_method in ('cash', 'transfer')),
  payment_status text default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
  order_status text default 'pending' check (order_status in ('pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled')),
  voucher_id uuid references public.vouchers,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Order Items ───────────────────────────────────────────────
create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders on delete cascade not null,
  product_id uuid references public.products not null,
  product_name_vi text not null,
  product_name_en text not null,
  size text not null check (size in ('M', 'L')),
  quantity int not null check (quantity > 0),
  unit_price int not null,
  addon_ids text[] default '{}',
  notes text
);

-- ── Order Status History ──────────────────────────────────────
create table public.order_status_history (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders on delete cascade not null,
  status text not null,
  note text,
  changed_by uuid,
  created_at timestamptz default now()
);

-- ── Voucher Usage ─────────────────────────────────────────────
create table public.voucher_usage (
  id uuid default uuid_generate_v4() primary key,
  voucher_id uuid references public.vouchers not null,
  user_id uuid references public.profiles not null,
  order_id uuid references public.orders,
  used_at timestamptz default now(),
  unique(voucher_id, user_id)
);

-- ── Ratings ───────────────────────────────────────────────────
create table public.ratings (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders on delete cascade unique not null,
  user_id uuid references public.profiles not null,
  score int not null check (score between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

-- ── Push Subscriptions ────────────────────────────────────────
create table public.push_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  is_admin boolean default false,
  created_at timestamptz default now(),
  unique(endpoint)
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.handle_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone, full_name, default_delivery_address, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'phone', new.email),
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    new.raw_user_meta_data->>'default_delivery_address',
    coalesce(new.raw_user_meta_data->>'language', 'vi')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-log status history on order status change
create or replace function public.log_order_status_change()
returns trigger language plpgsql as $$
begin
  if old.order_status is distinct from new.order_status then
    insert into public.order_status_history (order_id, status)
    values (new.id, new.order_status);
  end if;
  return new;
end;
$$;

create trigger order_status_changed
  after update on public.orders
  for each row execute function public.log_order_status_change();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles              enable row level security;
alter table public.categories            enable row level security;
alter table public.products              enable row level security;
alter table public.addons                enable row level security;
alter table public.vouchers              enable row level security;
alter table public.orders                enable row level security;
alter table public.order_items           enable row level security;
alter table public.order_status_history  enable row level security;
alter table public.voucher_usage         enable row level security;
alter table public.ratings               enable row level security;
alter table public.push_subscriptions    enable row level security;

-- Profiles: users see only their own
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Categories & Products: public read
create policy "Anyone can view categories" on public.categories for select using (true);
create policy "Anyone can view products"   on public.products   for select using (true);
create policy "Anyone can view addons"     on public.addons     for select using (true);

-- Vouchers: public read (code lookup)
create policy "Anyone can view vouchers" on public.vouchers for select using (true);

-- Orders: users see their own; admin role sees all
create policy "Users can view own orders" on public.orders for select using (auth.uid() = user_id);
create policy "Users can create orders"   on public.orders for insert with check (auth.uid() = user_id);
create policy "Users can update own orders" on public.orders for update using (auth.uid() = user_id);

-- Order items
create policy "Users can view own order items" on public.order_items
  for select using (
    exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
  );
create policy "Users can insert order items" on public.order_items
  for insert with check (
    exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
  );

-- Status history: read own
create policy "Users can view own order history" on public.order_status_history
  for select using (
    exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
  );

-- Ratings
create policy "Users can view own ratings"   on public.ratings for select using (auth.uid() = user_id);
create policy "Users can insert ratings"     on public.ratings for insert with check (auth.uid() = user_id);

-- Push subscriptions
create policy "Users manage own push subs" on public.push_subscriptions
  for all using (auth.uid() = user_id);

-- Voucher usage
create policy "Users can view own voucher usage" on public.voucher_usage
  for select using (auth.uid() = user_id);
create policy "Users can insert voucher usage"   on public.voucher_usage
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- ADMIN POLICY (Service Role bypass RLS by default)
-- For admin app, use service role key or add role check
-- ============================================================

-- ============================================================
-- REALTIME: enable on orders for live updates
-- ============================================================
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_status_history;

-- ============================================================
-- SEED DATA — Categories
-- ============================================================
insert into public.categories (name_vi, name_en, slug, sort_order, icon) values
  ('Cà Phê',        'Coffee',    'coffee',    1, '☕'),
  ('Trà Sữa',       'Milk Tea',  'milk-tea',  2, '🧋'),
  ('Trà Xanh',      'Matcha',    'matcha',    3, '🍵'),
  ('Thức Uống Nóng','Hot Drink', 'hot-drink', 4, '🔥'),
  ('Đá Xay',        'Frappe',    'frappe',    5, '🥤'),
  ('Trà Trái Cây',  'Fruit Tea', 'fruit-tea', 6, '🍑');

-- ============================================================
-- SEED DATA — Addons
-- ============================================================
insert into public.addons (name_vi, name_en, price) values
  ('Thêm Đào',             'Add Peach',                10),
  ('Thêm Vải Miếng',       'Add Lychee',               10),
  ('Thêm Hạt Sen',         'Add Lotus Seeds',          10),
  ('Thêm Kem Tươi',        'Add Whipping Cream',       10),
  ('Thêm Nha Đam',         'Add Aloe Vera',            10),
  ('Thêm Cà Phê',          'Add Espresso Shot',        10),
  ('Thêm Trân Châu Đen',   'Add Black Tapioca Pearls', 10),
  ('Thêm Kem Foam',        'Add Cream Foam',           10),
  ('Thêm Trân Châu Trắng 3Q', 'Add White Crystal Pearls 3Q', 10);

-- ============================================================
-- SEED DATA — Sample Voucher
-- ============================================================
insert into public.vouchers (code, type, value, min_order_amount, usage_limit, expires_at) values
  ('WELCOME10', 'percent', 10, 50000, 100, now() + interval '30 days'),
  ('LSP50K',    'fixed',   50, 150000, 50,  now() + interval '7 days');

-- ============================================================
-- BANNERS & SYSTEM SETTINGS
-- ============================================================
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
create policy "Anyone can view active banners" on public.banners for select using (true);
create policy "Full access to banners" on public.banners for all using (true);

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz default now()
);

alter table public.system_settings enable row level security;
create policy "Anyone can read system settings" on public.system_settings for select using (true);
create policy "Full access to system settings" on public.system_settings for all using (true);

insert into public.system_settings (key, value, description) values
  ('shipping', '{"shipping_fee": 10000, "free_shipping_threshold": 100000, "enabled": true}'::jsonb, 'Phí ship cơ bản & ngưỡng freeship'),
  ('employee_discount', '{"discount_percent": 20, "enabled": true}'::jsonb, 'Mặc định giảm 20% cho nhân viên nội bộ LSP')
on conflict (key) do nothing;

insert into public.banners (title_vi, title_en, subtitle_vi, subtitle_en, badge_vi, badge_en, image_url, link_url, sort_order, is_active) values
  ('Cà Phê Kem Muối Long Sơn', 'Long Son Salted Foam Coffee', 'Vị cà phê đậm đà kết hợp lớp foam muối béo mịn trứ danh', 'Rich coffee flavor combined with signature salted cream foam', 'Món Mới', 'New', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=1000&q=80', '/menu/cafe-muoi-long-son', 1, true),
  ('Ưu đãi 20% Nhân viên LSP', '20% Off for LSP Staff', 'Tự động áp dụng giảm 20% cho toàn bộ đơn hàng của nhân viên LSP', 'Automatically applied 20% discount on all orders for internal staff', 'Nội Bộ', 'Exclusive', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1000&q=80', '/menu', 2, true),
  ('Miễn phí giao hàng tại LSP', 'Free Delivery within LSP', 'Freeship tận tay cho mọi đơn hàng từ 100.000đ tại 21 điểm giao', 'Free delivery for orders from 100,000 VND to all 21 factory zones', 'Freeship', 'Free Ship', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=1000&q=80', '/menu', 3, true);

