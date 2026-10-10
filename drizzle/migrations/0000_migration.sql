
create type public.app_role as enum ('admin','rep','warehouse','driver');
create type public.order_status as enum ('new','preparing','ready','assigned','out_for_delivery','delivered','cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique(user_id, role)
);
grant select, insert, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant all on public.profiles, public.user_roles to service_role;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;
create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id)
$$;

create policy "staff read profiles" on public.profiles for select to authenticated using (public.is_staff(auth.uid()) or id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "read roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));

create or replace function public.set_user_role(_user_id uuid, _role public.app_role, _enabled boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  if _enabled then insert into public.user_roles(user_id, role) values (_user_id,_role) on conflict do nothing;
  else delete from public.user_roles where user_id=_user_id and role=_role; end if;
end $$;
grant execute on function public.set_user_role to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.raw_user_meta_data->>'phone');
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id,'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  address text,
  lat double precision,
  lng double precision,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  unit text not null default 'قطعة',
  price numeric(12,2) not null default 0,
  stock numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  qty numeric(12,2) not null,
  note text,
  order_id uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null default auth.uid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  photo_path text,
  lat double precision,
  lng double precision,
  note text,
  has_order boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity,
  customer_id uuid not null references public.customers(id),
  visit_id uuid references public.visits(id) on delete set null,
  rep_id uuid default auth.uid(),
  driver_id uuid,
  status public.order_status not null default 'new',
  delivery_at timestamptz,
  address text,
  phone text,
  lat double precision,
  lng double precision,
  notes text,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  qty numeric(12,2) not null,
  price numeric(12,2) not null default 0
);
create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  actor uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.driver_locations (
  driver_id uuid primary key,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.customers, public.products, public.stock_movements, public.visits, public.orders, public.order_items, public.order_events, public.driver_locations to authenticated;
grant all on public.customers, public.products, public.stock_movements, public.visits, public.orders, public.order_items, public.order_events, public.driver_locations to service_role;

alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.visits enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.driver_locations enable row level security;

create policy "staff read" on public.customers for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff read" on public.products for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff read" on public.stock_movements for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff read" on public.visits for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff read" on public.orders for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff read" on public.order_items for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff read" on public.order_events for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff read" on public.driver_locations for select to authenticated using (public.is_staff(auth.uid()));

create policy "rep write" on public.customers for insert to authenticated with check (public.has_role(auth.uid(),'rep') or public.has_role(auth.uid(),'admin'));
create policy "rep update" on public.customers for update to authenticated using (public.has_role(auth.uid(),'rep') or public.has_role(auth.uid(),'admin'));
create policy "wh insert" on public.products for insert to authenticated with check (public.has_role(auth.uid(),'warehouse') or public.has_role(auth.uid(),'admin'));
create policy "wh update" on public.products for update to authenticated using (public.has_role(auth.uid(),'warehouse') or public.has_role(auth.uid(),'admin'));
create policy "wh delete" on public.products for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "wh insert" on public.stock_movements for insert to authenticated with check (public.has_role(auth.uid(),'warehouse') or public.has_role(auth.uid(),'admin'));
create policy "rep insert" on public.visits for insert to authenticated with check (rep_id = auth.uid() and (public.has_role(auth.uid(),'rep') or public.has_role(auth.uid(),'admin')));
create policy "rep insert" on public.orders for insert to authenticated with check (public.has_role(auth.uid(),'rep') or public.has_role(auth.uid(),'admin'));
create policy "staff update" on public.orders for update to authenticated using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'warehouse') or (public.has_role(auth.uid(),'driver') and driver_id = auth.uid())
);
create policy "rep insert" on public.order_items for insert to authenticated with check (public.has_role(auth.uid(),'rep') or public.has_role(auth.uid(),'admin'));
create policy "driver upsert" on public.driver_locations for insert to authenticated with check (driver_id = auth.uid());
create policy "driver update" on public.driver_locations for update to authenticated using (driver_id = auth.uid());

create or replace function public.apply_stock_movement() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.products set stock = stock + new.qty where id = new.product_id;
  return new;
end $$;
create trigger trg_stock after insert on public.stock_movements for each row execute function public.apply_stock_movement();

create or replace function public.order_status_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if new.driver_id is not null and old.driver_id is null and new.status in ('new','preparing','ready') then
    new.status := 'assigned';
  end if;
  if new.status is distinct from old.status then
    insert into public.order_events(order_id, status, actor) values (new.id, new.status, auth.uid());
    if new.status in ('ready','assigned') and old.status in ('new','preparing') then
      insert into public.stock_movements(product_id, qty, note, order_id, created_by)
      select product_id, -qty, 'صرف طلب #' || new.number, new.id, auth.uid() from public.order_items where order_id = new.id;
    end if;
  end if;
  return new;
end $$;
create trigger trg_order_status before update on public.orders for each row execute function public.order_status_change();

create or replace function public.order_created() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.order_events(order_id, status, actor) values (new.id, new.status, auth.uid());
  return new;
end $$;
create trigger trg_order_created after insert on public.orders for each row execute function public.order_created();

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.driver_locations;
alter publication supabase_realtime add table public.visits;
alter publication supabase_realtime add table public.products;

create policy "staff upload photos" on storage.objects for insert to authenticated with check (bucket_id = 'shop-photos' and public.is_staff(auth.uid()));
create policy "staff read photos" on storage.objects for select to authenticated using (bucket_id = 'shop-photos' and public.is_staff(auth.uid()));
