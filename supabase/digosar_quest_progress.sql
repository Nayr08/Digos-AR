-- DigosAR quest progress migration
--
-- Run this after digosar_database.sql and digosar_app_seed.sql.
-- It stores the Dawis route progress in Supabase per authenticated user.
-- The app no longer needs localStorage for quest discoveries, platform clues,
-- quiz completion, or the unlocked tourist-spot route.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Published discovery steps
-- ---------------------------------------------------------------------------

create table if not exists public.quest_discovery_steps (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.quests(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  position integer not null check (position > 0),
  marker_src text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quest_id, slug),
  unique (quest_id, position)
);

create index if not exists quest_discovery_steps_quest_idx
  on public.quest_discovery_steps(quest_id, position);

-- ---------------------------------------------------------------------------
-- One progress row per authenticated user and quest
-- ---------------------------------------------------------------------------

create table if not exists public.user_quest_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  discoveries text[] not null default '{}'::text[],
  platform_clue text,
  quiz_completed boolean not null default false,
  quiz_score integer not null default 0 check (quiz_score >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, quest_id)
);

create index if not exists user_quest_progress_user_idx
  on public.user_quest_progress(user_id, updated_at desc);

-- Keep timestamps consistent with the other DigosAR progress tables.
drop trigger if exists quest_discovery_steps_set_updated_at on public.quest_discovery_steps;
create trigger quest_discovery_steps_set_updated_at
before update on public.quest_discovery_steps
for each row execute function public.set_updated_at();

drop trigger if exists user_quest_progress_set_updated_at on public.user_quest_progress;
create trigger user_quest_progress_set_updated_at
before update on public.user_quest_progress
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Dawis discovery definitions used by the current Quest screen
-- ---------------------------------------------------------------------------

insert into public.quest_discovery_steps (quest_id, slug, title, position, marker_src)
select q.id, step.slug, step.title, step.position, step.marker_src
from public.quests q
cross join (values
  ('shoreline-rocks', 'Shoreline rocks', 1, '/ar/targets/quest/shoreline-rocks.png'),
  ('mooring-bollards', 'Rusted bollards', 2, '/ar/targets/quest/mooring-bollards.png'),
  ('support-piles', 'Pier support piles', 3, '/ar/targets/quest/support-piles.png'),
  ('terminal-platform', 'Terminal platform', 4, '/ar/targets/quest/terminal-platform.png')
) as step(slug, title, position, marker_src)
where q.slug = 'dawis-sunrise-stories'
on conflict (quest_id, slug) do update
set title = excluded.title,
    position = excluded.position,
    marker_src = excluded.marker_src,
    updated_at = now();

-- ---------------------------------------------------------------------------
-- Secure progress policies
-- ---------------------------------------------------------------------------

alter table public.quest_discovery_steps enable row level security;
alter table public.user_quest_progress enable row level security;

drop policy if exists "Published quest discovery steps are readable" on public.quest_discovery_steps;
create policy "Published quest discovery steps are readable"
on public.quest_discovery_steps
for select
using (
  is_published
  and exists (
    select 1
    from public.quests q
    where q.id = quest_id and q.is_published
  )
);

drop policy if exists "Users manage their quest progress" on public.user_quest_progress;
create policy "Users manage their quest progress"
on public.user_quest_progress
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Atomic marker discovery RPC
-- ---------------------------------------------------------------------------
-- The browser calls this after MindAR recognizes a quest marker. The function
-- validates the quest and discovery step, then appends the step once. Repeated
-- scans are idempotent and cannot create duplicate discovery values.

create or replace function public.record_quest_discovery(
  p_quest_id uuid,
  p_discovery_slug text
)
returns public.user_quest_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  progress_row public.user_quest_progress;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to record quest progress';
  end if;

  if not exists (
    select 1 from public.quests
    where id = p_quest_id and is_published
  ) then
    raise exception 'Quest is not available';
  end if;

  if not exists (
    select 1 from public.quest_discovery_steps
    where quest_id = p_quest_id
      and slug = p_discovery_slug
      and is_published
  ) then
    raise exception 'Discovery step is not available for this quest';
  end if;

  insert into public.user_quest_progress (user_id, quest_id, discoveries)
  values (auth.uid(), p_quest_id, array[p_discovery_slug]::text[])
  on conflict (user_id, quest_id) do update
  set discoveries = case
      when p_discovery_slug = any(public.user_quest_progress.discoveries)
        then public.user_quest_progress.discoveries
      else array_append(public.user_quest_progress.discoveries, p_discovery_slug)
    end,
    updated_at = now();

  select * into progress_row
  from public.user_quest_progress
  where user_id = auth.uid() and quest_id = p_quest_id;

  return progress_row;
end;
$$;

revoke execute on function public.record_quest_discovery(uuid, text) from public;
grant execute on function public.record_quest_discovery(uuid, text) to authenticated;

commit;

