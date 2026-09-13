'use client';

import { useEffect, useRef, useState } from 'react';

const EDGE_GAP = 8;
const MIN_TOP_GAP = 70;
const NAV_GAP = 20;
const DRAG_THRESHOLD = 5;

type Position = { x: number; y: number };

export function QuestMascotGuide({
  initialMessage,
  secondaryMessage,
}: {
  initialMessage: string;
  secondaryMessage: string;
}) {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isReady, setIsReady] = useState(false);
  const [messageVisible, setMessageVisible] = useState(true);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [messageOnRight, setMessageOnRight] = useState(false);
  const [messageBeside, setMessageBeside] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(position);
  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  });

  const getBounds = () => {
    const phone = rootRef.current?.closest<HTMLElement>('.phone')?.getBoundingClientRect();
    const mascot = rootRef.current?.getBoundingClientRect();
    const nav = document.querySelector<HTMLElement>('.bottom-nav')?.getBoundingClientRect();
    const width = mascot?.width || 108;
    const height = mascot?.height || 108;
    const leftEdge = Math.max(0, phone?.left ?? 0);
    const rightEdge = Math.min(window.innerWidth, phone?.right ?? window.innerWidth);
    const topEdge = Math.max(0, phone?.top ?? 0);
    const bottomEdge = Math.min(window.innerHeight, phone?.bottom ?? window.innerHeight);
    const navHeight = nav?.height ?? 68;

    return {
      minX: leftEdge + EDGE_GAP,
      maxX: Math.max(leftEdge + EDGE_GAP, rightEdge - width - EDGE_GAP),
      minY: topEdge + MIN_TOP_GAP,
      maxY: Math.max(topEdge + MIN_TOP_GAP, bottomEdge - height - navHeight - NAV_GAP),
    };
  };

  const clampPosition = (next: Position, bounds = getBounds()) => {
    return {
      x: Math.min(Math.max(next.x, bounds.minX), bounds.maxX),
      y: Math.min(Math.max(next.y, bounds.minY), bounds.maxY),
    };
  };

  const commitPosition = (next: Position) => {
    const bounds = getBounds();
    const clamped = clampPosition(next, bounds);
    positionRef.current = clamped;
    setPosition(clamped);
    setMessageOnRight(clamped.x < bounds.minX + 190);
    setMessageBeside(clamped.y < bounds.minY + 105);
  };

  useEffect(() => {
    const placeInitially = () => {
      const bounds = getBounds();
      if (!isReady) {
        commitPosition({
          x: bounds.minX,
          y: bounds.maxY,
        });
        setIsReady(true);
      } else {
        commitPosition(positionRef.current);
      }
    };

    const frame = window.requestAnimationFrame(placeInitially);
    window.addEventListener('resize', placeInitially);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', placeInitially);
    };
  }, [isReady]);

  useEffect(() => {
    const idleImage = new window.Image();
    const blinkImage = new window.Image();
    idleImage.src = '/mascot/mascot-thinking-idle.webp';
    blinkImage.src = '/mascot/mascot-thinking-blink.webp';

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
    const updateMotionPreference = () => {
      clearTimers();
      setIsBlinking(false);
      if (!reducedMotion.matches) scheduleBlink();
    };

    if (!reducedMotion.matches) scheduleBlink();
    reducedMotion.addEventListener('change', updateMotionPreference);
    return () => {
      clearTimers();
      reducedMotion.removeEventListener('change', updateMotionPreference);
    };
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: positionRef.current.x,
      originY: positionRef.current.y,
      moved: false,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.hypot(deltaX, deltaY) >= DRAG_THRESHOLD) drag.moved = true;
    commitPosition({ x: drag.originX + deltaX, y: drag.originY + deltaY });
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLButtonElement>, cancelled = false) => {
    if (dragRef.current.pointerId !== event.pointerId) return;
    const wasDrag = dragRef.current.moved;
    dragRef.current.pointerId = -1;
    setIsDragging(false);
    if (!cancelled && !wasDrag) setMessageVisible((visible) => !visible);
  };

  return <div
    ref={rootRef}
    className={`quest-mascot-guide ${isReady ? 'is-ready' : ''} ${isDragging ? 'is-dragging' : ''} ${messageOnRight ? 'message-right' : ''} ${messageBeside ? 'message-beside' : ''}`}
    style={{ left: position.x, top: position.y }}
  >
    <div className={`quest-guide-message ${messageVisible ? 'is-visible' : ''}`} aria-hidden={!messageVisible}>
      <strong>{initialMessage}</strong>
      <span>{secondaryMessage}</span>
    </div>
    <button
      className="quest-mascot-button"
      type="button"
      aria-label="Toggle DigosAR quest guide message"
      aria-expanded={messageVisible}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => handlePointerEnd(event)}
      onPointerCancel={(event) => handlePointerEnd(event, true)}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
          event.preventDefault();
          setMessageVisible((visible) => !visible);
        }
      }}
    >
      <span className="quest-mascot-float">
        {/* oxlint-disable-next-line next/no-img-element */}
        <img className={`quest-mascot-frame ${isBlinking ? '' : 'is-visible'}`} src="/mascot/mascot-thinking-idle.webp" alt="" draggable={false} />
        {/* oxlint-disable-next-line next/no-img-element */}
        <img className={`quest-mascot-frame ${isBlinking ? 'is-visible' : ''}`} src="/mascot/mascot-thinking-blink.webp" alt="" draggable={false} />
      </span>
    </button>
  </div>;
}
