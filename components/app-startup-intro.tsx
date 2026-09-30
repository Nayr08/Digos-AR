'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

export function AppStartupIntro() {
  const [visible, setVisible] = useState(true);
  const hideTimer = useRef<number | null>(null);
  const fallbackTimer = useRef<number | null>(null);

  useEffect(() => {
    // A fallback prevents a broken/slow image request from trapping the app on
    // its launch screen. Normally the timer starts after the logo has loaded.
    fallbackTimer.current = window.setTimeout(() => setVisible(false), 7000);
    return () => {
      if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current);
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    };
  }, []);

  const finishAfterLogoReady = () => {
    if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current);
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Keep the still/revealed logo visible long enough to be seen on a cold
    // Home Screen launch; do not let a CSS animation hide it before hydration.
    hideTimer.current = window.setTimeout(() => setVisible(false), reducedMotion ? 900 : 1350);
  };

  if (!visible) return null;

  return (
    <div className="app-startup-intro" aria-hidden="true">
      <div className="app-startup-brand">
        <span className="app-startup-logo-wrap">
          <span className="app-startup-orbit" />
          <Image src="/digosar-icon-logo.webp" alt="" width={1254} height={1254} unoptimized fetchPriority="high" onLoad={finishAfterLogoReady} onError={finishAfterLogoReady} />
        </span>
        <small>EXPLORE DIGOS CITY</small>
      </div>
    </div>
  );
}
