-- DigosAR application content seed
-- Run supabase/digosar_database.sql first, then run this file in Supabase SQL Editor.

begin;

insert into public.categories (slug, name, icon, sort_order) values
  ('heritage', 'Heritage', 'landmark', 1),
  ('history', 'History', 'history', 2),
  ('nature', 'Nature', 'leaf', 3),
  ('culture', 'Culture', 'church', 4)
on conflict (slug) do update set
  name = excluded.name,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

-- Keep old prototype records for safety, but remove them from the public app.
update public.tourist_spots
set is_published = false, is_featured = false
where slug in ('kapatagan', 'digos-mother-tree', 'mt-apo-view-trail', 'dawis-beach');

update public.quests
set is_published = false
where slug = 'kapatagan-trail';

insert into public.tourist_spots (
  category_id, slug, name, location, short_description, about, history,
  cultural_significance, best_time_to_visit, distance_km, xp_reward, rating,
  hero_image_url, is_ar_supported, is_featured, is_published
) values
  ((select id from public.categories where slug = 'heritage'),
   'dawis-heritage-wharf', 'Dawis Heritage Wharf', 'Sunrise Boulevard, Digos City',
   'A waterfront promenade where Digos wakes to views of the Davao Gulf.',
   'Dawis Heritage Wharf offers an open coastal setting for sunrise walks, sea views, and relaxed community visits.',
   'The Dawis waterfront reflects the city''s long relationship with coastal travel, fishing, and community trade.',
   'Sunrise walks, family gatherings, and views across the gulf make the wharf a shared civic space.',
   'Sunrise', 6.80, 100, 4.8, '/dawis-coast.png', false, true, true),
  ((select id from public.categories where slug = 'history'),
   'rizal-park', 'Rizal Park', 'Digos City',
   'A central public park for civic events, quiet breaks, and community gatherings.',
   'Rizal Park is an accessible green space in the city center where residents meet, rest, and take part in public activities.',
   'Named for national hero José Rizal, the park is part of the city center''s civic landscape.',
   'The park serves as a meeting place and venue for public celebrations in Digos.',
   'Late afternoon', 0.50, 100, 4.7, '/digos-mother-tree.png', false, true, true),
  ((select id from public.categories where slug = 'nature'),
   'digos-city-eco-park-arboretum', 'Digos City Eco Park and Arboretum', 'Digos City',
   'A green learning space dedicated to trees, biodiversity, and environmental stewardship.',
   'The eco park and arboretum combines nature appreciation, recreation, and environmental learning in one city destination.',
   'The city developed the eco park and arboretum as a place for conservation, recreation, and environmental activities.',
   'Tree planting and nature education connect visitors with Digos City''s environmental programs.',
   'Early morning', 4.80, 100, 4.9, '/digos-highlands.png', false, true, true),
  ((select id from public.categories where slug = 'culture'),
   'mary-mother-mediatrix-cathedral', 'Mary, Mother and Mediatrix of Grace Cathedral', 'Rizal Avenue, Digos City',
   'The cathedral church of the Diocese of Digos and a living center of local Catholic faith.',
   'The cathedral welcomes worshippers and visitors to a major spiritual and architectural landmark in the city center.',
   'The cathedral is closely tied to the growth of the Diocese of Digos and its Marian devotion.',
   'Worship, feast-day observances, and diocesan gatherings make the cathedral a major spiritual landmark.',
   'Morning', 0.80, 100, 4.9, '/digos-mother-tree.png', false, true, true)
on conflict (slug) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  location = excluded.location,
  short_description = excluded.short_description,
  about = excluded.about,
  history = excluded.history,
  cultural_significance = excluded.cultural_significance,
  best_time_to_visit = excluded.best_time_to_visit,
  distance_km = excluded.distance_km,
  xp_reward = excluded.xp_reward,
  rating = excluded.rating,
  hero_image_url = excluded.hero_image_url,
  is_ar_supported = excluded.is_ar_supported,
  is_featured = excluded.is_featured,
  is_published = excluded.is_published;

insert into public.badges (slug, name, description, icon, color, xp_required) values
  ('coastal-storykeeper', 'Coastal Storykeeper', 'Complete the Dawis Heritage Wharf quiz.', 'waves', '#4CC9C0', 0),
  ('rizal-scholar', 'Rizal Scholar', 'Complete the Rizal Park quiz.', 'book-open', '#F4C542', 0),
  ('green-guardian', 'Green Guardian', 'Complete the Eco Park and Arboretum quiz.', 'leaf', '#78C850', 0),
  ('cathedral-guide', 'Cathedral Guide', 'Complete the cathedral quiz.', 'landmark', '#B8FF72', 0)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  color = excluded.color,
  xp_required = excluded.xp_required;

insert into public.quests (tourist_spot_id, slug, title, description, xp_reward, badge_id, is_published)
select s.id, seed.slug, seed.title, seed.description, 150, b.id, true
from (values
  ('dawis-heritage-wharf', 'dawis-sunrise-stories', 'Dawis Sunrise Stories', 'Discover the coast, community, and sunrise character of Dawis.', 'coastal-storykeeper'),
  ('rizal-park', 'rizal-park-civic-quest', 'Rizal Park Civic Quest', 'Learn why this central park matters to Digos City.', 'rizal-scholar'),
  ('digos-city-eco-park-arboretum', 'eco-park-green-quest', 'Eco Park Green Quest', 'Explore biodiversity, trees, and environmental stewardship.', 'green-guardian'),
  ('mary-mother-mediatrix-cathedral', 'cathedral-heritage-quest', 'Cathedral Heritage Quest', 'Learn about the cathedral and its role in the Diocese of Digos.', 'cathedral-guide')
) as seed(spot_slug, slug, title, description, badge_slug)
join public.tourist_spots s on s.slug = seed.spot_slug
join public.badges b on b.slug = seed.badge_slug
on conflict (slug) do update set
  tourist_spot_id = excluded.tourist_spot_id,
  title = excluded.title,
  description = excluded.description,
  xp_reward = excluded.xp_reward,
  badge_id = excluded.badge_id,
  is_published = excluded.is_published;

do $$
declare
  quest_uuid uuid;
  question_uuid uuid;
begin
  -- Dawis Heritage Wharf
  select id into quest_uuid from public.quests where slug = 'dawis-sunrise-stories';
  delete from public.quest_questions where quest_id = quest_uuid;

  insert into public.quest_questions (quest_id, question_text, explanation, position, xp_reward)
  values (quest_uuid, 'What time best matches the character of Sunrise Boulevard?', 'The Dawis waterfront is especially associated with sunrise views over the gulf.', 1, 50)
  returning id into question_uuid;
  insert into public.quest_options (question_id, option_text, position, is_correct) values
    (question_uuid, 'Sunrise', 1, true), (question_uuid, 'Midnight', 2, false),
    (question_uuid, 'Noon', 3, false), (question_uuid, 'Late night', 4, false);

  insert into public.quest_questions (quest_id, question_text, explanation, position, xp_reward)
  values (quest_uuid, 'Which body of water can visitors look toward from the Dawis waterfront?', 'Digos City faces the Davao Gulf.', 2, 50)
  returning id into question_uuid;
  insert into public.quest_options (question_id, option_text, position, is_correct) values
    (question_uuid, 'Davao Gulf', 1, true), (question_uuid, 'Laguna de Bay', 2, false),
    (question_uuid, 'Taal Lake', 3, false), (question_uuid, 'Manila Bay', 4, false);

  insert into public.quest_questions (quest_id, question_text, explanation, position, xp_reward)
  values (quest_uuid, 'What is a respectful way to enjoy the wharf?', 'Keeping the waterfront clean protects the shared coastal space.', 3, 50)
  returning id into question_uuid;
  insert into public.quest_options (question_id, option_text, position, is_correct) values
    (question_uuid, 'Keep the area clean', 1, true), (question_uuid, 'Leave litter behind', 2, false),
    (question_uuid, 'Damage public fixtures', 3, false), (question_uuid, 'Block the walkway', 4, false);

  -- Rizal Park
  select id into quest_uuid from public.quests where slug = 'rizal-park-civic-quest';
  delete from public.quest_questions where quest_id = quest_uuid;

  insert into public.quest_questions (quest_id, question_text, explanation, position, xp_reward)
  values (quest_uuid, 'For whom is Rizal Park named?', 'The park honors Philippine national hero Dr. José Rizal.', 1, 50)
  returning id into question_uuid;
  insert into public.quest_options (question_id, option_text, position, is_correct) values
    (question_uuid, 'Dr. José Rizal', 1, true), (question_uuid, 'Andres Bonifacio', 2, false),
    (question_uuid, 'Apolinario Mabini', 3, false), (question_uuid, 'Emilio Aguinaldo', 4, false);

  insert into public.quest_questions (quest_id, question_text, explanation, position, xp_reward)
  values (quest_uuid, 'What type of place is Rizal Park in Digos?', 'It is a central civic green space for residents and visitors.', 2, 50)
  returning id into question_uuid;
  insert into public.quest_options (question_id, option_text, position, is_correct) values
    (question_uuid, 'A public civic park', 1, true), (question_uuid, 'A private factory', 2, false),
    (question_uuid, 'An airport runway', 3, false), (question_uuid, 'A marine sanctuary', 4, false);

  insert into public.quest_questions (quest_id, question_text, explanation, position, xp_reward)
  values (quest_uuid, 'Which activity fits the park best?', 'The park supports community gatherings and public activities.', 3, 50)
  returning id into question_uuid;
  insert into public.quest_options (question_id, option_text, position, is_correct) values
    (question_uuid, 'Community gatherings', 1, true), (question_uuid, 'Deep-sea diving', 2, false),
    (question_uuid, 'Mountain climbing', 3, false), (question_uuid, 'Commercial mining', 4, false);

  -- Digos City Eco Park and Arboretum
  select id into quest_uuid from public.quests where slug = 'eco-park-green-quest';
  delete from public.quest_questions where quest_id = quest_uuid;

  insert into public.quest_questions (quest_id, question_text, explanation, position, xp_reward)
  values (quest_uuid, 'What is an arboretum primarily designed to conserve and display?', 'An arboretum is a place where trees and other woody plants are cultivated for study and conservation.', 1, 50)
  returning id into question_uuid;
  insert into public.quest_options (question_id, option_text, position, is_correct) values
    (question_uuid, 'Trees and woody plants', 1, true), (question_uuid, 'Motor vehicles', 2, false),
    (question_uuid, 'Factory equipment', 3, false), (question_uuid, 'Fishing boats', 4, false);

  insert into public.quest_questions (quest_id, question_text, explanation, position, xp_reward)
  values (quest_uuid, 'Which activity supports the purpose of the Eco Park?', 'Tree planting contributes to conservation and environmental education.', 2, 50)
  returning id into question_uuid;
  insert into public.quest_options (question_id, option_text, position, is_correct) values
    (question_uuid, 'Tree planting', 1, true), (question_uuid, 'Illegal logging', 2, false),
    (question_uuid, 'Dumping waste', 3, false), (question_uuid, 'Removing seedlings', 4, false);

  insert into public.quest_questions (quest_id, question_text, explanation, position, xp_reward)
  values (quest_uuid, 'How should visitors help protect the park?', 'Staying on designated paths helps protect plants and habitat.', 3, 50)
  returning id into question_uuid;
  insert into public.quest_options (question_id, option_text, position, is_correct) values
    (question_uuid, 'Use designated paths', 1, true), (question_uuid, 'Pick protected plants', 2, false),
    (question_uuid, 'Feed wildlife freely', 3, false), (question_uuid, 'Leave plastic waste', 4, false);

  -- Mary, Mother and Mediatrix of Grace Cathedral
  select id into quest_uuid from public.quests where slug = 'cathedral-heritage-quest';
  delete from public.quest_questions where quest_id = quest_uuid;

  insert into public.quest_questions (quest_id, question_text, explanation, position, xp_reward)
  values (quest_uuid, 'The cathedral is the principal church of which diocese?', 'It is the cathedral church of the Roman Catholic Diocese of Digos.', 1, 50)
  returning id into question_uuid;
  insert into public.quest_options (question_id, option_text, position, is_correct) values
    (question_uuid, 'Diocese of Digos', 1, true), (question_uuid, 'Diocese of Laoag', 2, false),
    (question_uuid, 'Diocese of Kalibo', 3, false), (question_uuid, 'Diocese of Cubao', 4, false);

  insert into public.quest_questions (quest_id, question_text, explanation, position, xp_reward)
  values (quest_uuid, 'Where is the cathedral located?', 'The cathedral is located along Rizal Avenue in Digos City.', 2, 50)
  returning id into question_uuid;
  insert into public.quest_options (question_id, option_text, position, is_correct) values
    (question_uuid, 'Rizal Avenue', 1, true), (question_uuid, 'Sunrise Boulevard', 2, false),
    (question_uuid, 'Kapatagan summit', 3, false), (question_uuid, 'Dawis shoreline', 4, false);

  insert into public.quest_questions (quest_id, question_text, explanation, position, xp_reward)
  values (quest_uuid, 'How should a visitor behave inside the cathedral?', 'Quiet and respectful behavior honors the cathedral as an active place of worship.', 3, 50)
  returning id into question_uuid;
  insert into public.quest_options (question_id, option_text, position, is_correct) values
    (question_uuid, 'Remain quiet and respectful', 1, true), (question_uuid, 'Interrupt services', 2, false),
    (question_uuid, 'Climb restricted areas', 3, false), (question_uuid, 'Play loud music', 4, false);
end;
$$;

-- Award XP and the quest badge once, on the user's first completed attempt.
create or replace function public.award_first_quiz_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  quest_badge_id uuid;
begin
  if new.completed_at is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.completed_at is not null then
    return new;
  end if;

  if exists (
    select 1
    from public.quiz_attempts previous
    where previous.user_id = new.user_id
      and previous.quest_id = new.quest_id
      and previous.completed_at is not null
      and previous.id <> new.id
  ) then
    return new;
  end if;

  update public.profiles
  set total_xp = total_xp + new.xp_earned,
      level = greatest(1, floor((total_xp + new.xp_earned) / 500.0)::integer + 1)
  where id = new.user_id;

  insert into public.xp_transactions (user_id, amount, source_type, source_id, description)
  values (new.user_id, new.xp_earned, 'quiz', new.quest_id, 'Completed a DigosAR place quiz');

  select badge_id into quest_badge_id
  from public.quests
  where id = new.quest_id;

  if quest_badge_id is not null then
    insert into public.user_badges (user_id, badge_id)
    values (new.user_id, quest_badge_id)
    on conflict (user_id, badge_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists quiz_completion_awards on public.quiz_attempts;
create trigger quiz_completion_awards
after insert or update of completed_at on public.quiz_attempts
for each row execute function public.award_first_quiz_completion();

commit;
