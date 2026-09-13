'use client';

import { useEffect, useRef, useState } from 'react';

const EDGE_GAP = 8;
const DRAG_THRESHOLD = 5;

export function ExploreMascotGuide({
  message,
  secondaryMessage,
}: {
  message: string;
  secondaryMessage: string;
}) {
  const [messageVisible, setMessageVisible] = useState(true);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [positionX, setPositionX] = useState(EDGE_GAP);
  const [messageOnLeft, setMessageOnLeft] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(positionX);
  const dragRef = useRef({ pointerId: -1, startX: 0, originX: 0, moved: false });

  const commitPosition = (value: number) => {
    const containerWidth = rootRef.current?.parentElement?.getBoundingClientRect().width ?? 414;
    const mascotWidth = rootRef.current?.getBoundingClientRect().width ?? 100;
    const maxX = Math.max(EDGE_GAP, containerWidth - mascotWidth - EDGE_GAP);
    const nextX = Math.min(Math.max(value, EDGE_GAP), maxX);
    positionRef.current = nextX;
    setPositionX(nextX);
    setMessageOnLeft(nextX > containerWidth * 0.48);
  };

  useEffect(() => {
    const container = rootRef.current?.parentElement;
    if (!container) return;

    const placeInitially = () => {
      const width = container.getBoundingClientRect().width;
      commitPosition(positionRef.current === EDGE_GAP ? width : positionRef.current);
    };
    const frame = window.requestAnimationFrame(placeInitially);
    const resizeObserver = new ResizeObserver(placeInitially);
    resizeObserver.observe(container);
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const idleImage = new window.Image();
    const blinkImage = new window.Image();
    idleImage.src = '/mascot/mascot-hanging-idle.webp';
    blinkImage.src = '/mascot/mascot-hanging-blink.webp';

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
      originX: positionRef.current,
      moved: false,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    if (Math.abs(deltaX) >= DRAG_THRESHOLD) drag.moved = true;
    commitPosition(drag.originX + deltaX);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLButtonElement>, cancelled = false) => {
    if (dragRef.current.pointerId !== event.pointerId) return;
    const wasDrag = dragRef.current.moved;
    dragRef.current.pointerId = -1;
    setIsDragging(false);
    if (!cancelled && !wasDrag) setMessageVisible((visible) => !visible);
  };

  return <div ref={rootRef} className={`explore-mascot-guide ${isDragging ? 'is-dragging' : ''} ${messageOnLeft ? 'message-left' : ''}`} style={{ left: positionX }}>
    <button
      className="explore-mascot-button"
      type="button"
      aria-label="Toggle DigosAR Explore guide message"
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
      <span className="explore-mascot-sway">
        {/* oxlint-disable-next-line next/no-img-element */}
        <img className={`explore-mascot-frame ${isBlinking ? '' : 'is-visible'}`} src="/mascot/mascot-hanging-idle.webp" alt="" draggable={false} />
        {/* oxlint-disable-next-line next/no-img-element */}
        <img className={`explore-mascot-frame ${isBlinking ? 'is-visible' : ''}`} src="/mascot/mascot-hanging-blink.webp" alt="" draggable={false} />
      </span>
    </button>
    <div className={`explore-guide-message ${messageVisible ? 'is-visible' : ''}`} aria-hidden={!messageVisible}>
      <strong>{message}</strong>
      <span>{secondaryMessage}</span>
    </div>
  </div>;
}
