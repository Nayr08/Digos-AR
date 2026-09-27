import { supabase } from '@/lib/supabase';

export type SyncedQuestProgress = {
  discoveries: string[];
  quizCompleted: boolean;
  quizScore: number;
  platformClue: string | null;
  completedAt: string | null;
};

export type QuestProgressLoad = {
  questId: string;
  progress: SyncedQuestProgress | null;
};

type QuestIdRow = { id: string };
type ProgressRow = {
  discoveries: string[] | null;
  quiz_completed: boolean | null;
  quiz_score: number | null;
  platform_clue: string | null;
  completed_at: string | null;
};

function normalizeProgress(row: ProgressRow | null): SyncedQuestProgress | null {
  if (!row) return null;
  return {
    discoveries: Array.isArray(row.discoveries) ? row.discoveries.filter((value): value is string => typeof value === 'string') : [],
    quizCompleted: row.quiz_completed === true,
    quizScore: typeof row.quiz_score === 'number' ? row.quiz_score : 0,
    platformClue: typeof row.platform_clue === 'string' ? row.platform_clue : null,
    completedAt: typeof row.completed_at === 'string' ? row.completed_at : null,
  };
}

export async function loadDawisQuestProgress(userId: string, touristSpotId: string): Promise<QuestProgressLoad | null> {
  const { data: quest, error: questError } = await supabase
    .from('quests')
    .select('id')
    .eq('tourist_spot_id', touristSpotId)
    .eq('slug', 'dawis-sunrise-stories')
    .eq('is_published', true)
    .maybeSingle();

  if (questError) throw questError;
  if (!quest) return null;

  const questRow = quest as QuestIdRow;
  const { data: progress, error: progressError } = await supabase
    .from('user_quest_progress')
    .select('discoveries, platform_clue, quiz_completed, quiz_score, completed_at')
    .eq('user_id', userId)
    .eq('quest_id', questRow.id)
    .maybeSingle();

  if (progressError) throw progressError;
  return { questId: questRow.id, progress: normalizeProgress(progress as ProgressRow | null) };
}

export async function saveDawisQuestProgress(
  userId: string,
  questId: string,
  progress: SyncedQuestProgress,
): Promise<void> {
  const { error } = await supabase.from('user_quest_progress').upsert({
    user_id: userId,
    quest_id: questId,
    discoveries: progress.discoveries,
    platform_clue: progress.platformClue,
    quiz_completed: progress.quizCompleted,
    quiz_score: progress.quizScore,
    completed_at: progress.completedAt,
  }, { onConflict: 'user_id,quest_id' });

  if (error) throw error;
}

export async function recordDawisQuestDiscovery(
  userId: string,
  questId: string,
  discoverySlug: string,
): Promise<SyncedQuestProgress | null> {
  // The user ID is intentionally part of this helper's contract so callers
  // cannot accidentally record an anonymous or another user's discovery.
  if (!userId) throw new Error('Authentication is required to record a discovery.');

  const { data, error } = await supabase.rpc('record_quest_discovery', {
    p_quest_id: questId,
    p_discovery_slug: discoverySlug,
  });
  if (error) throw error;
  return normalizeProgress(data as ProgressRow | null);
}

