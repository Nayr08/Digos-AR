-- DigosAR marker-specific unlock state
--
-- Run this after digosar_database.sql. The app uses target_id to distinguish
-- the main Dawis entry marker from the four quest discovery markers, so the
-- Dawis quest cannot be opened until the entry marker has been recognized.

begin;

alter table public.ar_scan_history
  add column if not exists target_id text;

create index if not exists ar_scan_history_target_idx
  on public.ar_scan_history(user_id, tourist_spot_id, target_id, scanned_at desc);

comment on column public.ar_scan_history.target_id is
  'DigosAR MindAR target identifier, such as dawis or shoreline-rocks.';

commit;
