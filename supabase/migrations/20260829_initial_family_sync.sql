-- Skryga cloud schema. Safe to run repeatedly.
create extension if not exists pgcrypto;

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Моя семья',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table if not exists public.cloud_records (
  id uuid primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  entity_type text not null check (entity_type in ('transaction', 'savings_goal', 'pension_fund', 'budget_limit', 'settings')),
  payload jsonb not null default '{}'::jsonb,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  unique (family_id, entity_type, id)
);

create table if not exists public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  email text not null,
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists cloud_records_family_updated_idx on public.cloud_records(family_id, updated_at);
create index if not exists family_invitations_email_idx on public.family_invitations(lower(email));

create or replace function public.is_family_member(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = target_family_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_family_owner(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = target_family_id and user_id = auth.uid() and role = 'owner'
  );
$$;

revoke all on function public.is_family_member(uuid) from public;
revoke all on function public.is_family_owner(uuid) from public;
grant execute on function public.is_family_member(uuid) to authenticated;
grant execute on function public.is_family_owner(uuid) to authenticated;

create or replace function public.accept_family_invitation(invitation_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.family_invitations%rowtype;
  account_email text;
begin
  account_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  select * into invitation from public.family_invitations
  where token = invitation_token and accepted_at is null and expires_at > now()
  for update;

  if invitation.id is null or lower(invitation.email) <> account_email then
    raise exception 'Invitation is invalid, expired, or belongs to another email';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (invitation.family_id, auth.uid(), 'member')
  on conflict (family_id, user_id) do nothing;

  update public.family_invitations set accepted_at = now() where id = invitation.id;
  return invitation.family_id;
end;
$$;

revoke all on function public.accept_family_invitation(uuid) from public;
grant execute on function public.accept_family_invitation(uuid) to authenticated;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.cloud_records enable row level security;
alter table public.family_invitations enable row level security;

drop policy if exists "members read families" on public.families;
create policy "members read families" on public.families for select to authenticated
using (public.is_family_member(id));

drop policy if exists "owners update families" on public.families;
create policy "owners update families" on public.families for update to authenticated
using (public.is_family_owner(id)) with check (public.is_family_owner(id));

drop policy if exists "members read memberships" on public.family_members;
create policy "members read memberships" on public.family_members for select to authenticated
using (public.is_family_member(family_id));

drop policy if exists "owners manage memberships" on public.family_members;
create policy "owners manage memberships" on public.family_members for all to authenticated
using (public.is_family_owner(family_id)) with check (public.is_family_owner(family_id));

drop policy if exists "members read records" on public.cloud_records;
create policy "members read records" on public.cloud_records for select to authenticated
using (public.is_family_member(family_id));

drop policy if exists "members insert records" on public.cloud_records;
create policy "members insert records" on public.cloud_records for insert to authenticated
with check (public.is_family_member(family_id) and updated_by = auth.uid());

drop policy if exists "members update records" on public.cloud_records;
create policy "members update records" on public.cloud_records for update to authenticated
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id) and updated_by = auth.uid());

drop policy if exists "members delete records" on public.cloud_records;
create policy "members delete records" on public.cloud_records for delete to authenticated
using (public.is_family_member(family_id));

drop policy if exists "owners read invitations" on public.family_invitations;
create policy "owners read invitations" on public.family_invitations for select to authenticated
using (public.is_family_owner(family_id) or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists "owners create invitations" on public.family_invitations;
create policy "owners create invitations" on public.family_invitations for insert to authenticated
with check (public.is_family_owner(family_id) and invited_by = auth.uid());

drop policy if exists "owners delete invitations" on public.family_invitations;
create policy "owners delete invitations" on public.family_invitations for delete to authenticated
using (public.is_family_owner(family_id));

create or replace function public.bootstrap_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family_id uuid;
begin
  insert into public.families (name, created_by)
  values ('Моя семья', new.id)
  returning id into new_family_id;

  insert into public.family_members (family_id, user_id, role)
  values (new_family_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_skryga on auth.users;
create trigger on_auth_user_created_skryga
  after insert on auth.users
  for each row execute procedure public.bootstrap_new_user();

-- Backfill a family for users created before this migration.
do $$
declare
  account record;
  new_family_id uuid;
begin
  for account in
    select u.id from auth.users u
    where not exists (select 1 from public.family_members fm where fm.user_id = u.id)
  loop
    insert into public.families (name, created_by) values ('Моя семья', account.id)
    returning id into new_family_id;
    insert into public.family_members (family_id, user_id, role)
    values (new_family_id, account.id, 'owner');
  end loop;
end;
$$;

grant select, insert, update, delete on public.families to authenticated;
grant select, insert, update, delete on public.family_members to authenticated;
grant select, insert, update, delete on public.cloud_records to authenticated;
grant select, insert, update, delete on public.family_invitations to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cloud_records'
  ) then
    alter publication supabase_realtime add table public.cloud_records;
  end if;
end;
$$;
