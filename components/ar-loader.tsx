'use client';

import { useState } from 'react';
import { Camera, ScanLine } from 'lucide-react';

export function ARLoader({ label = 'Loading…', compact = false }: { label?: string; compact?: boolean }) {
  const [assetFailed, setAssetFailed] = useState(false);

  return <output className={`ar-loader ${compact ? 'compact' : ''}`} aria-live="polite">
    <span className="ar-loader-visual" aria-hidden="true">
      {/* oxlint-disable-next-line next/no-img-element */}
      <img
        className={assetFailed ? 'failed' : ''}
        src="/ar-loader/ar-loading-icon-optimized.gif"
        alt=""
        fetchPriority="high"
        onError={() => setAssetFailed(true)}
      />
      {assetFailed && <span className="ar-loader-fallback"><Camera size={compact ? 18 : 27} /><ScanLine size={compact ? 28 : 48} /></span>}
    </span>
    <span className="ar-loader-label">{label}</span>
  </output>;
}
