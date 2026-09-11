import { supabase } from '@/lib/supabase';

export type Destination = {
  id?: string;
  slug: string;
  name: string;
  location: string;
  description: string;
  type: string;
  best: string;
  distance: string;
  rating: string;
  image: string;
  position: string;
  history: string;
  culture: string;
  xpReward: number;
};

export type QuizOption = {
  id: string;
  text: string;
  position: number;
  isCorrect: boolean;
};

export type QuizQuestion = {
  id: string;
  text: string;
  explanation: string;
  position: number;
  xpReward: number;
  options: QuizOption[];
};

export type SpotQuest = {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  questions: QuizQuestion[];
};

export const fallbackDestinations: Destination[] = [
  {
    slug: 'dawis-heritage-wharf',
    name: 'Dawis Heritage Wharf',
    location: 'Sunrise Boulevard, Digos City',
    rating: '4.8',
    type: 'Heritage',
    best: 'Sunrise',
    distance: '6.8 km',
    image: '/dawis-coast.png',
    position: 'center',
    description: 'A waterfront promenade where Digos wakes to views of the Davao Gulf.',
    history: 'The Dawis waterfront reflects the city’s long relationship with coastal travel, fishing, and community trade.',
    culture: 'Sunrise walks, family gatherings, and views across the gulf make the wharf a shared civic space.',
    xpReward: 100,
  },
  {
    slug: 'rizal-park',
    name: 'Rizal Park',
    location: 'Digos City',
    rating: '4.7',
    type: 'History',
    best: 'Late afternoon',
    distance: '0.5 km',
    image: '/digos-mother-tree.png',
    position: 'center',
    description: 'A central public park for civic events, quiet breaks, and community gatherings.',
    history: 'Named for national hero José Rizal, the park is part of the city center’s civic landscape.',
    culture: 'The park serves as an accessible meeting place and venue for public celebrations in Digos.',
    xpReward: 100,
  },
  {
    slug: 'digos-city-eco-park-arboretum',
    name: 'Digos City Eco Park and Arboretum',
    location: 'Digos City',
    rating: '4.9',
    type: 'Nature',
    best: 'Early morning',
    distance: '4.8 km',
    image: '/digos-highlands.png',
    position: 'center',
    description: 'A green learning space dedicated to trees, biodiversity, and environmental stewardship.',
    history: 'The city developed the eco park and arboretum as a place for conservation, recreation, and environmental activities.',
    culture: 'Tree planting and nature education connect visitors with Digos City’s environmental programs.',
    xpReward: 100,
  },
  {
    slug: 'mary-mother-mediatrix-cathedral',
    name: 'Mary, Mother and Mediatrix of Grace Cathedral',
    location: 'Rizal Avenue, Digos City',
    rating: '4.9',
    type: 'Culture',
    best: 'Morning',
    distance: '0.8 km',
    image: '/digos-mother-tree.png',
    position: 'center',
    description: 'The cathedral church of the Diocese of Digos and a living center of local Catholic faith.',
    history: 'The cathedral is closely tied to the growth of the Diocese of Digos and its Marian devotion.',
    culture: 'Worship, feast-day observances, and diocesan gatherings make the cathedral a major spiritual landmark.',
    xpReward: 100,
  },
];

const featuredSlugs = fallbackDestinations.map((spot) => spot.slug);

type SpotRow = {
  id: string;
  slug: string;
  name: string;
  location: string;
  short_description: string;
  history: string | null;
  cultural_significance: string | null;
  best_time_to_visit: string | null;
  distance_km: number | string | null;
  rating: number | string;
  hero_image_url: string | null;
  xp_reward: number;
  categories: { name: string } | { name: string }[] | null;
};

export async function loadTouristSpots(): Promise<Destination[]> {
  const { data, error } = await supabase
    .from('tourist_spots')
    .select('id, slug, name, location, short_description, history, cultural_significance, best_time_to_visit, distance_km, rating, hero_image_url, xp_reward, categories(name)')
    .in('slug', featuredSlugs)
    .eq('is_published', true);

  if (error) throw error;

  const rows = (data ?? []) as unknown as SpotRow[];
  const bySlug = new Map(rows.map((row) => [row.slug, row]));

  return featuredSlugs.map((slug) => {
    const fallback = fallbackDestinations.find((spot) => spot.slug === slug)!;
    const row = bySlug.get(slug);
    if (!row) return fallback;
    const category = Array.isArray(row.categories) ? row.categories[0]?.name : row.categories?.name;
    const distance = row.distance_km == null ? fallback.distance : `${Number(row.distance_km).toFixed(1).replace('.0', '')} km`;
    return {
      ...fallback,
      id: row.id,
      name: row.name,
      location: row.location,
      description: row.short_description,
      type: category ?? fallback.type,
      best: row.best_time_to_visit ?? fallback.best,
      distance,
      rating: Number(row.rating).toFixed(1),
      image: row.hero_image_url || fallback.image,
      history: row.history ?? fallback.history,
      culture: row.cultural_significance ?? fallback.culture,
      xpReward: row.xp_reward,
    };
  });
}

type QuestRow = {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  quest_questions: Array<{
    id: string;
    question_text: string;
    explanation: string | null;
    position: number;
    xp_reward: number;
    quest_options: Array<{
      id: string;
      option_text: string;
      position: number;
      is_correct: boolean;
    }>;
  }>;
};

export async function loadQuestForSpot(spotId?: string): Promise<SpotQuest | null> {
  if (!spotId) return null;
  const { data, error } = await supabase
    .from('quests')
    .select('id, title, description, xp_reward, quest_questions(id, question_text, explanation, position, xp_reward, quest_options(id, option_text, position, is_correct))')
    .eq('tourist_spot_id', spotId)
    .eq('is_published', true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as QuestRow;
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    xpReward: row.xp_reward,
    questions: [...row.quest_questions]
      .sort((a, b) => a.position - b.position)
      .map((question) => ({
        id: question.id,
        text: question.question_text,
        explanation: question.explanation ?? '',
        position: question.position,
        xpReward: question.xp_reward,
        options: [...question.quest_options]
          .sort((a, b) => a.position - b.position)
          .map((option) => ({
            id: option.id,
            text: option.option_text,
            position: option.position,
            isCorrect: option.is_correct,
          })),
      })),
  };
}
