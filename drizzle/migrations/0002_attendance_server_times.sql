create or replace function public.attendance_enforce_times()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.has_role(auth.uid(), 'admin') then return new; end if;
  if tg_op = 'INSERT' then
    new.check_in := now();
    new.check_out := null;
  else
    new.check_in := old.check_in;
    new.user_id := old.user_id;
    if old.check_out is not null then
      new.check_out := old.check_out;
      new.out_lat := old.out_lat; new.out_lng := old.out_lng;
    elsif new.check_out is not null then
      new.check_out := now();
    end if;
  end if;
  return new;
end $$;
drop trigger if exists attendance_enforce_times on public.attendance;
create trigger attendance_enforce_times before insert or update on public.attendance
for each row execute function public.attendance_enforce_times();