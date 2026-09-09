-- 003_functions.sql

-- 1. Trigger on auth.users INSERT -> auto-create profiles row
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Trigger on events UPDATE -> auto-set updated_at to now()
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_events_updated_at
  before update on public.events
  for each row execute procedure public.set_updated_at();

-- 3. Function + trigger: when events.status changes to 'registered', 
-- auto-set active_stage_id to the first stage (lowest round_number) if not already set
create or replace function public.handle_event_status_change()
returns trigger as $$
declare
  first_stage_id uuid;
begin
  -- Only act if status changed to 'registered' and active_stage_id is null
  if new.status = 'registered' and old.status != 'registered' and new.active_stage_id is null then
    -- Find the first stage (lowest round number)
    select id into first_stage_id
    from public.event_stages
    where event_id = new.id
    order by round_number asc
    limit 1;
    
    -- Set it as active if found
    if first_stage_id is not null then
      new.active_stage_id = first_stage_id;
    end if;
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger on_event_status_registered
  before update on public.events
  for each row execute procedure public.handle_event_status_change();
