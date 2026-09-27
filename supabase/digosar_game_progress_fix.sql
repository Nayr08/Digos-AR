-- Fix for the profile-level milestone trigger.
--
-- Run this after digosar_game_progress.sql. The profiles table identifies an
-- account with `id`, while activity tables identify it with `user_id`. The
-- old trigger function used new.user_id for both and caused quiz inserts to
-- fail when the quiz award updated a profile level.

begin;

create or replace function public.award_profile_progress_badges_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.award_progress_badges(new.id);
  return new;
end;
$$;

revoke execute on function public.award_profile_progress_badges_trigger() from public, anon, authenticated;

drop trigger if exists profile_level_progress_awards on public.profiles;
create trigger profile_level_progress_awards
after update of level on public.profiles
for each row execute function public.award_profile_progress_badges_trigger();

commit;
