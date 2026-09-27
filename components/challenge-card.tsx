import { ChevronRight } from 'lucide-react';

export type Challenge = {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  rewardXP: number;
  category: string;
  type: 'weekly' | 'multi-location' | 'xp' | 'ar-scans' | 'activities';
};

export function ChallengeCard({ challenge, onContinue }: { challenge: Challenge; onContinue?: () => void }) {
  const safeTarget = Math.max(challenge.target, 1);
  const safeProgress = Math.max(0, Math.min(challenge.progress, safeTarget));

  return <section className="home-challenge" aria-labelledby={`challenge-${challenge.id}`}>
    <article className="challenge-card">
      <header className="challenge-card-head">
        <div><small>Weekly Challenge</small><h2 id={`challenge-${challenge.id}`}>{challenge.title}</h2></div>
        <button type="button" onClick={onContinue}>Continue <ChevronRight size={17} /></button>
      </header>
      <div className="challenge-progress-copy">
        <span><strong>{safeProgress} / {safeTarget}</strong> visited</span>
        <strong>+{challenge.rewardXP} XP</strong>
      </div>
      <progress className="challenge-progress" aria-label={`${challenge.title} progress`} value={safeProgress} max={safeTarget} />
    </article>
  </section>;
}
