type LoadingSkeletonVariant = 'app' | 'auth' | 'button' | 'model' | 'quest';

type LoadingSkeletonProps = {
  variant: LoadingSkeletonVariant;
  label: string;
  className?: string;
};

function SkeletonShape({ className = '' }: { className?: string }) {
  return <span className={`loading-skeleton-shape ${className}`} aria-hidden="true" />;
}

export function LoadingSkeleton({ variant, label, className = '' }: LoadingSkeletonProps) {
  if (variant === 'button') {
    return <output className={`loading-skeleton-button ${className}`} aria-label={label}>
      <SkeletonShape className="loading-skeleton-button-icon" />
      <SkeletonShape className="loading-skeleton-button-label" />
    </output>;
  }

  if (variant === 'model') {
    return <output className={`loading-skeleton loading-skeleton-model ${className}`} aria-label={label}>
      <div className="loading-skeleton-model-object" aria-hidden="true">
        <SkeletonShape className="loading-skeleton-model-top" />
        <SkeletonShape className="loading-skeleton-model-core" />
        <SkeletonShape className="loading-skeleton-model-base" />
      </div>
    </output>;
  }

  if (variant === 'quest') {
    return <output className={`loading-skeleton loading-skeleton-quest ${className}`} aria-label={label}>
      <div className="loading-skeleton-quest-heading" aria-hidden="true">
        <SkeletonShape className="loading-skeleton-quest-eyebrow" />
        <SkeletonShape className="loading-skeleton-quest-title" />
        <SkeletonShape className="loading-skeleton-quest-progress" />
      </div>
      <div className="loading-skeleton-quest-answers" aria-hidden="true">
        {[0, 1, 2, 3].map((item) => <SkeletonShape key={item} />)}
      </div>
      <SkeletonShape className="loading-skeleton-quest-submit" />
    </output>;
  }

  if (variant === 'auth') {
    return <output className={`loading-skeleton loading-skeleton-auth ${className}`} aria-label={label}>
      <div className="loading-skeleton-auth-content" aria-hidden="true">
        <SkeletonShape className="loading-skeleton-auth-avatar" />
        <SkeletonShape className="loading-skeleton-auth-title" />
        <SkeletonShape className="loading-skeleton-auth-copy" />
        <SkeletonShape className="loading-skeleton-auth-field" />
        <SkeletonShape className="loading-skeleton-auth-field" />
        <SkeletonShape className="loading-skeleton-auth-submit" />
      </div>
    </output>;
  }

  return <output className={`loading-skeleton loading-skeleton-app ${className}`} aria-label={label}>
    <div className="loading-skeleton-app-frame" aria-hidden="true">
      <div className="loading-skeleton-app-header"><SkeletonShape /><SkeletonShape /><SkeletonShape /></div>
      <div className="loading-skeleton-app-hero"><SkeletonShape /><SkeletonShape /></div>
      <div className="loading-skeleton-app-stats"><SkeletonShape /><SkeletonShape /><SkeletonShape /></div>
      <div className="loading-skeleton-app-cards">
        {[0, 1, 2].map((item) => <div className="loading-skeleton-app-card" key={item}><SkeletonShape /><span><SkeletonShape /><SkeletonShape /><SkeletonShape /></span></div>)}
      </div>
      <div className="loading-skeleton-app-nav"><SkeletonShape /><SkeletonShape /><SkeletonShape /><SkeletonShape /></div>
    </div>
  </output>;
}
