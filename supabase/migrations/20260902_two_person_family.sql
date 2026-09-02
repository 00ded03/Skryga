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
