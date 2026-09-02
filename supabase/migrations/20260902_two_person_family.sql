-- Keep Skryga families limited to two accounts and make invitation acceptance
-- deterministic for users who already own an automatically-created family.
create or replace function public.accept_family_invitation(invitation_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.family_invitations%rowtype;
  account_email text;
  member_count integer;
begin
  account_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  select * into invitation
  from public.family_invitations
  where token = invitation_token
    and accepted_at is null
    and expires_at > now()
  for update;

  if invitation.id is null or lower(invitation.email) <> account_email then
    raise exception 'Invitation is invalid, expired, or belongs to another email';
  end if;

  select count(*) into member_count
  from public.family_members
  where family_id = invitation.family_id;

  if member_count >= 2 and not exists (
    select 1 from public.family_members
    where family_id = invitation.family_id and user_id = auth.uid()
  ) then
    raise exception 'This family already has two accounts';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (invitation.family_id, auth.uid(), 'member')
  on conflict (family_id, user_id) do nothing;

  update public.family_invitations
  set accepted_at = now()
  where id = invitation.id;

  return invitation.family_id;
end;
$$;

revoke all on function public.accept_family_invitation(uuid) from public;
grant execute on function public.accept_family_invitation(uuid) to authenticated;

create or replace function public.create_family_invitation(invitee_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_family_id uuid;
  normalized_email text;
  invitation_token uuid;
begin
  normalized_email := lower(trim(invitee_email));
  if normalized_email = '' or normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'A valid email is required';
  end if;

  select family_id into target_family_id
  from public.family_members
  where user_id = auth.uid() and role = 'owner'
  order by created_at
  limit 1;

  if target_family_id is null then
    raise exception 'Only a family owner can invite a member';
  end if;

  if (select count(*) from public.family_members where family_id = target_family_id) >= 2 then
    raise exception 'This family already has two accounts';
  end if;

  if normalized_email = lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'You cannot invite your own account';
  end if;

  select token into invitation_token
  from public.family_invitations
  where family_id = target_family_id
    and lower(email) = normalized_email
    and accepted_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if invitation_token is null then
    insert into public.family_invitations (family_id, email, invited_by)
    values (target_family_id, normalized_email, auth.uid())
    returning token into invitation_token;
  end if;

  return invitation_token;
end;
$$;

revoke all on function public.create_family_invitation(text) from public;
grant execute on function public.create_family_invitation(text) to authenticated;
