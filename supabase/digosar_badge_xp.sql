-- Run in the Supabase SQL Editor after digosar_game_progress.sql.
-- Each achievement awards 100 XP by default, separately from quiz XP.
-- Safe to rerun: existing badge XP transactions are never credited twice.
begin;

alter table public.badges
  add column if not exists xp_reward integer not null default 100
  check (xp_reward >= 0);

-- Include the profile trigger correction for installations missing that fix.
create or replace function public.award_profile_progress_badges_trigger()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  perform public.award_progress_badges(new.id);
  return new;
end;
$$;
revoke execute on function public.award_profile_progress_badges_trigger()
  from public, anon, authenticated;

create or replace function public.credit_badge_xp(p_user_id uuid, p_badge_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  reward_amount integer;
  badge_name text;
begin
  -- Serialize awards per profile, including concurrent awards of different badges.
  perform 1 from public.profiles where id = p_user_id for update;
  if not found then return; end if;

  if not exists (
    select 1 from public.user_badges
    where user_id = p_user_id and badge_id = p_badge_id
  ) or exists (
    select 1 from public.xp_transactions
    where user_id = p_user_id and source_type = 'badge' and source_id = p_badge_id
  ) then return; end if;

  select xp_reward, name into reward_amount, badge_name
  from public.badges where id = p_badge_id;
  if reward_amount is null or reward_amount <= 0 then return; end if;

  -- Record before updating the level, which can unlock another milestone badge.
  insert into public.xp_transactions(user_id, amount, source_type, source_id, description)
  values (p_user_id, reward_amount, 'badge', p_badge_id, 'Achievement unlocked: ' || badge_name);

  update public.profiles
  set total_xp = total_xp + reward_amount,
      level = greatest(1, ((total_xp + reward_amount) / 500) + 1)
  where id = p_user_id;
end;
$$;
revoke execute on function public.credit_badge_xp(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.award_badge_xp_trigger()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  perform public.credit_badge_xp(new.user_id, new.badge_id);
  return new;
end;
$$;
revoke execute on function public.award_badge_xp_trigger()
  from public, anon, authenticated;

drop trigger if exists badge_xp_awards on public.user_badges;
create trigger badge_xp_awards after insert on public.user_badges
for each row execute function public.award_badge_xp_trigger();

-- Credit already-earned badges, preserving all existing quiz and other XP.
do $$
declare earned record;
begin
  for earned in select user_id, badge_id from public.user_badges order by user_id, badge_id loop
    perform public.credit_badge_xp(earned.user_id, earned.badge_id);
  end loop;
end;
$$;

commit;
