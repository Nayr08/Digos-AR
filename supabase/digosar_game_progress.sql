-- DigosAR game progress and milestone rewards
--
-- Run this after digosar_database.sql, digosar_app_seed.sql, and
-- digosar_quest_progress.sql. The existing tables store the raw progress;
-- this migration adds automatic milestone badges so rewards are granted by
-- Supabase when a user reaches them, rather than by a client-side counter.

begin;

create or replace function public.award_progress_badges(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  badge_uuid uuid;
begin
  if p_user_id is null then
    return;
  end if;

  -- First Explorer: reach one published tourist spot.
  if exists (
    select 1 from public.user_spot_progress
    where user_id = p_user_id and status in ('visited', 'completed')
  ) then
    select id into badge_uuid from public.badges where slug = 'first-explorer';
    if badge_uuid is not null then
      insert into public.user_badges (user_id, badge_id)
      values (p_user_id, badge_uuid)
      on conflict (user_id, badge_id) do nothing;
    end if;
  end if;

  -- AR Explorer: recognize three real tourist-spot markers.
  if (
    select count(*) from public.ar_scan_history
    where user_id = p_user_id and recognized and tourist_spot_id is not null
  ) >= 3 then
    select id into badge_uuid from public.badges where slug = 'ar-explorer';
    if badge_uuid is not null then
      insert into public.user_badges (user_id, badge_id)
      values (p_user_id, badge_uuid)
      on conflict (user_id, badge_id) do nothing;
    end if;
  end if;

  -- Quiz Master: complete ten quizzes across the DigosAR route.
  if (
    select count(*) from public.quiz_attempts
    where user_id = p_user_id and completed_at is not null
  ) >= 10 then
    select id into badge_uuid from public.badges where slug = 'quiz-master';
    if badge_uuid is not null then
      insert into public.user_badges (user_id, badge_id)
      values (p_user_id, badge_uuid)
      on conflict (user_id, badge_id) do nothing;
    end if;
  end if;

  -- Digos Explorer: reach level four through server-managed XP.
  if coalesce((select level from public.profiles where id = p_user_id), 1) >= 4 then
    select id into badge_uuid from public.badges where slug = 'digos-explorer';
    if badge_uuid is not null then
      insert into public.user_badges (user_id, badge_id)
      values (p_user_id, badge_uuid)
      on conflict (user_id, badge_id) do nothing;
    end if;
  end if;
end;
$$;

revoke execute on function public.award_progress_badges(uuid) from public, anon, authenticated;

create or replace function public.award_progress_badges_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_progress_badges(new.user_id);
  return new;
end;
$$;

revoke execute on function public.award_progress_badges_trigger() from public, anon, authenticated;

drop trigger if exists spot_progress_awards on public.user_spot_progress;
create trigger spot_progress_awards
after insert or update of status on public.user_spot_progress
for each row execute function public.award_progress_badges_trigger();

drop trigger if exists ar_scan_progress_awards on public.ar_scan_history;
create trigger ar_scan_progress_awards
after insert or update of recognized on public.ar_scan_history
for each row execute function public.award_progress_badges_trigger();

-- The z prefix makes this run after the existing quiz_completion_awards
-- trigger, so a newly earned level is visible to the milestone check.
drop trigger if exists zzz_quiz_progress_awards on public.quiz_attempts;
create trigger zzz_quiz_progress_awards
after insert or update of completed_at on public.quiz_attempts
for each row execute function public.award_progress_badges_trigger();

drop trigger if exists profile_level_progress_awards on public.profiles;
create or replace function public.award_profile_progress_badges_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- profiles uses id, while activity tables use user_id.
  perform public.award_progress_badges(new.id);
  return new;
end;
$$;

revoke execute on function public.award_profile_progress_badges_trigger() from public, anon, authenticated;

create trigger profile_level_progress_awards
after update of level on public.profiles
for each row execute function public.award_profile_progress_badges_trigger();

-- Backfill milestone rewards for accounts that already have activity before
-- this migration is installed.
do $$
declare
  profile_row record;
begin
  for profile_row in select id from public.profiles loop
    perform public.award_progress_badges(profile_row.id);
  end loop;
end;
$$;

commit;
