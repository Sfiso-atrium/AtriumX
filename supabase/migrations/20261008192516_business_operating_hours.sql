-- Public schedule only; business contact details and existing profile policies stay unchanged.
create function public.valid_business_hours(schedule jsonb)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare item record;
begin
  if schedule is null or jsonb_typeof(schedule) <> 'object' then return false; end if;
  for item in select * from jsonb_each(schedule) loop
    if item.key !~ '^[0-6]$' or jsonb_typeof(item.value) <> 'object' then return false; end if;
    if (select count(*) from jsonb_object_keys(item.value)) <> 2 then return false; end if;
    if not coalesce(
      jsonb_typeof(item.value->'open') = 'string' and
      jsonb_typeof(item.value->'close') = 'string' and
      (item.value->>'open') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and
      (item.value->>'close') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and
      item.value->>'open' <> item.value->>'close', false) then return false; end if;
  end loop;
  return true;
end;
$$;
revoke all on function public.valid_business_hours(jsonb) from public;
grant execute on function public.valid_business_hours(jsonb) to anon, authenticated;
create table public.business_operating_hours (
  business_id uuid primary key references public.business_profiles(id) on delete cascade,
  schedule jsonb not null check (public.valid_business_hours(schedule))
);
alter table public.business_operating_hours enable row level security;
grant select on public.business_operating_hours to anon, authenticated;
grant insert, update, delete on public.business_operating_hours to authenticated;
create policy "Public business hours" on public.business_operating_hours for select to anon, authenticated using (true);
create policy "Owners insert hours" on public.business_operating_hours for insert to authenticated with check ((select auth.uid()) = business_id);
create policy "Owners update hours" on public.business_operating_hours for update to authenticated using ((select auth.uid()) = business_id) with check ((select auth.uid()) = business_id);
create policy "Owners remove hours" on public.business_operating_hours for delete to authenticated using ((select auth.uid()) = business_id);
comment on table public.business_operating_hours is 'Weekly hours in Africa/Johannesburg. Keys 0=Mon to 6=Sun. Missing days are closed; no row means hours unknown. Closing before opening means next day.';
