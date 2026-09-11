-- 007_profiles_fix.sql

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Ensure profiles insert policy exists
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'profiles_insert' and tablename = 'profiles') then
    create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
  end if;
end $$;

-- Ensure handle_new_user trigger exists
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'HackFlow Member'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
