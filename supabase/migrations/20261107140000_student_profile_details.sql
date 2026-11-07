alter table public.profiles
  add column if not exists mobile_number text,
  add column if not exists age smallint,
  add column if not exists state text,
  add column if not exists district text;

alter table public.profiles
  drop constraint if exists profiles_age_range_check;
alter table public.profiles
  add constraint profiles_age_range_check
  check (age is null or age between 13 and 100);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

grant update (full_name, mobile_number, age, state, district)
  on public.profiles to authenticated;
