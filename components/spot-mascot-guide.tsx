'use client';

import { useEffect, useRef, useState } from 'react';

const MIN_Y = 80;
const DRAG_THRESHOLD = 5;

export function SpotMascotGuide({ initialMessage }: { initialMessage: string }) {
  const [positionY, setPositionY] = useState(80);
  const [messageVisible, setMessageVisible] = useState(true);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ pointerId: -1, startY: 0, originY: 0, moved: false });

  const clampY = (value: number) => {
    const mascotHeight = rootRef.current?.getBoundingClientRect().height ?? 140;
    const navHeight = document.querySelector<HTMLElement>('.bottom-nav')?.getBoundingClientRect().height ?? 68;
    const maxY = Math.max(MIN_Y, window.innerHeight - mascotHeight - navHeight - 20);
    return Math.min(Math.max(value, MIN_Y), maxY);
  };

  useEffect(() => {
    const placeInitially = () => setPositionY((current) => clampY(current === MIN_Y ? window.innerHeight * 0.45 : current));
    const frame = window.requestAnimationFrame(placeInitially);
    window.addEventListener('resize', placeInitially);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', placeInitially);
    };
  }, []);

  useEffect(() => {
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
        }, 130 + Math.random() * 50);
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
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startY: event.clientY, originY: positionY, moved: false };
    setIsDragging(true);
  };
  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return;
    const deltaY = event.clientY - dragRef.current.startY;
    if (Math.abs(deltaY) > DRAG_THRESHOLD) dragRef.current.moved = true;
    setPositionY(clampY(dragRef.current.originY + deltaY));
  };
  const handlePointerEnd = (event: React.PointerEvent<HTMLButtonElement>, cancelled = false) => {
    if (dragRef.current.pointerId !== event.pointerId) return;
    const wasDrag = dragRef.current.moved;
    dragRef.current.pointerId = -1;
    setIsDragging(false);
    if (!cancelled && !wasDrag) setMessageVisible((visible) => !visible);
  };

  return <div ref={rootRef} className={`spot-mascot-guide ${isDragging ? 'is-dragging' : ''}`} style={{ top: positionY }}>
    <div className={`spot-guide-message ${messageVisible ? 'is-visible' : ''}`} aria-hidden={!messageVisible}>{initialMessage}</div>
    <button
      className="spot-mascot-button"
      type="button"
      aria-label="Toggle DigosAR guide message"
      aria-expanded={messageVisible}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => handlePointerEnd(event)}
      onPointerCancel={(event) => handlePointerEnd(event, true)}
    >
      <span className="spot-mascot-float">
        {/* oxlint-disable-next-line next/no-img-element */}
        <img className={`spot-mascot-frame ${isBlinking ? '' : 'is-visible'}`} src="/mascot/mascot-side-idle.webp" alt="" draggable={false} />
        {/* oxlint-disable-next-line next/no-img-element */}
        <img className={`spot-mascot-frame ${isBlinking ? 'is-visible' : ''}`} src="/mascot/mascot-side-blink.webp" alt="" draggable={false} />
      </span>
    </button>
  </div>;
}
