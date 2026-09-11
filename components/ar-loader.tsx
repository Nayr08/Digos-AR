'use client';

import { useState } from 'react';
import { Camera, ScanLine } from 'lucide-react';

export function ARLoader({ label = 'Loading…', compact = false }: { label?: string; compact?: boolean }) {
  const [assetStatus, setAssetStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  return <output className={`ar-loader ${compact ? 'compact' : ''}`} aria-live="polite">
    <span className="ar-loader-visual" aria-hidden="true">
      {/* This optional file is user-replaceable and may be an animated GIF. */}
      {/* oxlint-disable-next-line next/no-img-element */}
      <img
        className={assetStatus}
        src="/ar-loader/ar-loading-icon.gif"
        alt=""
        fetchPriority="high"
        onLoad={() => setAssetStatus('ready')}
        onError={() => setAssetStatus('failed')}
      />
      {assetStatus !== 'ready' && <span className="ar-loader-fallback"><Camera size={compact ? 18 : 27} /><ScanLine size={compact ? 28 : 48} /></span>}
    </span>
    <span className="ar-loader-label">{label}</span>
  </output>;
}
