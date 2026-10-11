create table public.employee_pay (
  user_id uuid primary key,
  base_salary numeric not null default 0,
  housing_allowance numeric not null default 0,
  transport_allowance numeric not null default 0,
  other_allowance numeric not null default 0,
  daily_hours numeric not null default 8,
  work_days int not null default 26,
  shift_start time not null default '08:00',
  overtime_rate numeric not null default 1.5,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.employee_pay to authenticated;
grant all on public.employee_pay to service_role;
alter table public.employee_pay enable row level security;
create policy "pay read" on public.employee_pay for select to authenticated using (user_id = auth.uid() or has_role(auth.uid(),'admin'));
create policy "pay admin ins" on public.employee_pay for insert to authenticated with check (has_role(auth.uid(),'admin'));
create policy "pay admin upd" on public.employee_pay for update to authenticated using (has_role(auth.uid(),'admin'));

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  check_in timestamptz not null default now(),
  check_out timestamptz,
  in_lat double precision, in_lng double precision,
  out_lat double precision, out_lng double precision,
  note text
);
create index on public.attendance(user_id, check_in);
grant select, insert, update, delete on public.attendance to authenticated;
grant all on public.attendance to service_role;
alter table public.attendance enable row level security;
create policy "att read" on public.attendance for select to authenticated using (user_id = auth.uid() or has_role(auth.uid(),'admin'));
create policy "att ins" on public.attendance for insert to authenticated with check (user_id = auth.uid() and is_staff(auth.uid()));
create policy "att upd" on public.attendance for update to authenticated using (user_id = auth.uid() or has_role(auth.uid(),'admin'));
create policy "att del" on public.attendance for delete to authenticated using (has_role(auth.uid(),'admin'));

create table public.leaves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  kind text not null default 'annual' check (kind in ('annual','sick','unpaid','other')),
  paid boolean not null default true,
  start_date date not null,
  end_date date not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.leaves to authenticated;
grant all on public.leaves to service_role;
alter table public.leaves enable row level security;
create policy "lv read" on public.leaves for select to authenticated using (user_id = auth.uid() or has_role(auth.uid(),'admin'));
create policy "lv ins" on public.leaves for insert to authenticated with check ((user_id = auth.uid() and status='pending') or has_role(auth.uid(),'admin'));
create policy "lv upd" on public.leaves for update to authenticated using (has_role(auth.uid(),'admin'));
create policy "lv del" on public.leaves for delete to authenticated using (has_role(auth.uid(),'admin') or (user_id = auth.uid() and status='pending'));

create table public.pay_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  month text not null,
  kind text not null check (kind in ('allowance','deduction')),
  amount numeric not null,
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.pay_adjustments to authenticated;
grant all on public.pay_adjustments to service_role;
alter table public.pay_adjustments enable row level security;
create policy "adj read" on public.pay_adjustments for select to authenticated using (user_id = auth.uid() or has_role(auth.uid(),'admin'));
create policy "adj ins" on public.pay_adjustments for insert to authenticated with check (has_role(auth.uid(),'admin'));
create policy "adj del" on public.pay_adjustments for delete to authenticated using (has_role(auth.uid(),'admin'));

alter publication supabase_realtime add table public.attendance, public.leaves;