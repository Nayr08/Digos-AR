import { Trophy } from 'lucide-react';

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
    <p className="home-challenge-label">Weekly Challenge</p>
    <article className="challenge-card">
      <header className="challenge-card-head">
        <span className="challenge-icon"><Trophy size={18} /></span>
        <div><small>{challenge.category}</small><strong>Weekly Challenge</strong></div>
        <button type="button" onClick={onContinue}>Continue</button>
      </header>
      <div className="challenge-copy">
        <h2 id={`challenge-${challenge.id}`}>{challenge.title}</h2>
        <p>{challenge.description}</p>
      </div>
      <div className="challenge-progress-copy">
        <span><strong>{safeProgress} / {safeTarget}</strong> completed</span>
        <strong>+{challenge.rewardXP} XP</strong>
      </div>
      <progress className="challenge-progress" aria-label={`${challenge.title} progress`} value={safeProgress} max={safeTarget} />
    </article>
  </section>;
}
