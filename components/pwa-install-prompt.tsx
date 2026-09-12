'use client';

import { Download, Share, Smartphone, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }

    if (isStandalone() || window.sessionStorage.getItem('digosar-install-dismissed')) return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);
    let revealTimer: number | undefined;
    if (isIOS && isSafari) {
      revealTimer = window.setTimeout(() => {
        setShowIOSHelp(true);
        setVisible(true);
      }, 1200);
    }

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      window.setTimeout(() => setVisible(true), 1200);
    };
    const handleInstalled = () => {
      setVisible(false);
      setInstallEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      if (revealTimer) window.clearTimeout(revealTimer);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const dismiss = () => {
    window.sessionStorage.setItem('digosar-install-dismissed', 'true');
    setVisible(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') setVisible(false);
    setInstallEvent(null);
  };

  if (!visible || (!installEvent && !showIOSHelp)) return null;

  return (
    <dialog open className="pwa-install-card" aria-label="Install DigosAR">
      <button className="pwa-install-close" onClick={dismiss} aria-label="Close install prompt">
        <X size={17} />
      </button>
      <span className="pwa-install-icon"><Smartphone size={24} /></span>
      <div className="pwa-install-copy">
        <small>GET THE APP</small>
        <strong>Install DigosAR</strong>
        <p>{showIOSHelp ? 'Tap Share, then Add to Home Screen.' : 'Add it to your home screen for quicker access.'}</p>
      </div>
      {installEvent ? (
        <button className="pwa-install-action" onClick={() => void install()}>
          <Download size={16} /> Install
        </button>
      ) : (
        <span className="pwa-ios-action"><Share size={16} /> Share</span>
      )}
    </dialog>
  );
}
