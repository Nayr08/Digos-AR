'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export function AppStartupIntro() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Keep the brand visible even when motion is reduced. The CSS switches to a
    // still logo in that mode, so shortening the lifetime made the splash vanish
    // before it could be seen on some iOS Home Screen launches.
    const timer = window.setTimeout(() => setVisible(false), reducedMotion ? 950 : 1420);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="app-startup-intro" aria-hidden="true">
      <div className="app-startup-brand">
        <span className="app-startup-logo-wrap">
          <span className="app-startup-orbit" />
          <Image src="/digosar-icon-logo.webp" alt="" width={1254} height={1254} unoptimized fetchPriority="high" />
        </span>
        <small>EXPLORE DIGOS CITY</small>
      </div>
    </div>
  );
}
