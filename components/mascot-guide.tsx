'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export type MascotState = 'idle' | 'happy' | 'excited' | 'wink' | 'thinking' | 'blink';
export type MascotMessage = { title: string; text: string };

const mascotAssets: Partial<Record<MascotState, string>> = {
  idle: '/mascot/mascot-idle.webp',
  excited: '/mascot/mascot-idle.webp',
  wink: '/mascot/mascot-idle.webp',
  thinking: '/mascot/mascot-thinking-idle.webp',
  blink: '/mascot/mascot-blink.webp',
};

export function MascotGuide({
  state = 'idle',
  title = '',
  message,
  rotatingMessages,
}: {
  state?: MascotState;
  title?: ReactNode;
  message: string;
  rotatingMessages?: readonly MascotMessage[];
}) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isMessageChanging, setIsMessageChanging] = useState(false);
  const messageTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (state !== 'idle') return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let blinkTimer: number | undefined;
    let restoreTimer: number | undefined;

    const clearTimers = () => {
      if (blinkTimer) window.clearTimeout(blinkTimer);
      if (restoreTimer) window.clearTimeout(restoreTimer);
    };
    const scheduleBlink = () => {
      blinkTimer = window.setTimeout(() => {
        setIsBlinking(true);
        restoreTimer = window.setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 140 + Math.random() * 30);
      }, 3000 + Math.random() * 3000);
    };
    const handleMotionPreference = () => {
      clearTimers();
      setIsBlinking(false);
      if (!reducedMotion.matches) scheduleBlink();
    };

    if (!reducedMotion.matches) scheduleBlink();
    reducedMotion.addEventListener('change', handleMotionPreference);
    return () => {
      clearTimers();
      reducedMotion.removeEventListener('change', handleMotionPreference);
    };
  }, [state]);

  useEffect(() => () => {
    if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
  }, []);

  const changeMessage = () => {
    if (!rotatingMessages || rotatingMessages.length < 2 || isMessageChanging) return;
    setIsMessageChanging(true);
    messageTimerRef.current = window.setTimeout(() => {
      const offset = 1 + Math.floor(Math.random() * (rotatingMessages.length - 1));
      setMessageIndex((current) => (current + offset) % rotatingMessages.length);
      setIsMessageChanging(false);
    }, 170);
  };

  const baseAsset = mascotAssets[state] ?? mascotAssets.idle;
  const showBlink = state === 'idle' && isBlinking;
  const activeMessage = rotatingMessages?.[messageIndex];
  const displayTitle = activeMessage?.title ?? title;
  const displayText = activeMessage?.text ?? message;

  return <div className="mascot-guide">
    <button className="mascot-guide-figure" type="button" aria-label="Show another DigosAR guide message" onClick={changeMessage}>
      <div className="mascot-guide-sway">
        {/* oxlint-disable-next-line next/no-img-element */}
        <img className={`mascot-guide-frame ${showBlink ? '' : 'visible'}`} src={baseAsset} alt="" />
        {state === 'idle' && <>
          {/* oxlint-disable-next-line next/no-img-element */}
          <img className={`mascot-guide-frame ${showBlink ? 'visible' : ''}`} src={mascotAssets.blink} alt="" />
        </>}
      </div>
    </button>
    <div className="mascot-guide-message">
      <div className={`mascot-guide-copy ${isMessageChanging ? 'is-changing' : ''}`} aria-live="polite">
        {displayTitle && <div className="mascot-guide-title">{displayTitle}</div>}
        <p>{displayText}</p>
      </div>
    </div>
  </div>;
}
