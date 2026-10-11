'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

type MapWalkthroughStep = {
  target: string;
  context: string;
  title: string;
  body: string;
};

const steps: MapWalkthroughStep[] = [
  {
    target: '[data-map-tour="destination"]',
    context: 'MAP · CHOOSE A PLACE',
    title: 'Pick a destination',
    body: 'Choose a destination here. The route preview and Google Maps walking directions follow your selection.',
  },
  {
    target: '[data-map-tour="route-location"]',
    context: 'MAP · YOUR LOCATION',
    title: 'Show your walking route',
    body: 'Allow location once to draw a walking route to your selected destination. The route recalculates when you choose another place.',
  },
  {
    target: '[data-map-tour="map-view-toggle"]',
    context: 'MAP · 2D OR 3D',
    title: 'Choose your map view',
    body: 'Switch between a flat 2D map and a tilted 3D view. Building shapes are schematic and their heights may be estimated.',
  },
  {
    target: '[data-map-tour="map"]',
    context: 'MAP · FIND THE PIN',
    title: 'Follow the route on the map',
    body: 'The lime route follows mapped walking paths. Drag to explore, or zoom in to see available schematic building shapes and map labels.',
  },
  {
    target: '[data-map-tour="walking-directions"]',
    context: 'MAP · GOOGLE MAPS',
    title: 'Open walking directions',
    body: 'Choose this button to open Google Maps with a walking route to the selected destination.',
  },
];

type Frame = { left: number; top: number; width: number; height: number };

export function MapWalkthrough({ onFinish }: { onFinish: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [stepDirection, setStepDirection] = useState<'forward' | 'backward'>('forward');
  const [frame, setFrame] = useState<Frame | null>(null);
  const [callout, setCallout] = useState({ left: 12, top: 48 });
  const [targetUnavailable, setTargetUnavailable] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const calloutRef = useRef<HTMLElement>(null);
  const activeStep = steps[stepIndex];

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    let animationFrame = 0;
    let attempts = 0;
    let highlightedTarget: HTMLElement | null = null;

    const positionCenteredCallout = () => {
      const root = overlayRef.current;
      if (!root) return;
      const rootWidth = root.clientWidth || root.getBoundingClientRect().width;
      const rootHeight = root.clientHeight || root.getBoundingClientRect().height;
      const bubbleWidth = Math.min(rootWidth - 24, calloutRef.current?.offsetWidth || 300);
      const bubbleHeight = calloutRef.current?.offsetHeight || 280;
      setCallout({ left: Math.max(12, (rootWidth - bubbleWidth) / 2), top: Math.max(12, (rootHeight - bubbleHeight) / 2) });
    };

    const measureTarget = (target: HTMLElement) => {
      const root = overlayRef.current;
      if (cancelled || !root || !target.isConnected) return;
      const rootRect = root.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const rootWidth = root.clientWidth || rootRect.width;
      const rootHeight = root.clientHeight || rootRect.height;
      if (targetRect.width < 8 || targetRect.height < 8) {
        setFrame(null);
        setTargetUnavailable(true);
        positionCenteredCallout();
        return;
      }

      const scaleX = rootWidth ? rootRect.width / rootWidth : 1;
      const scaleY = rootHeight ? rootRect.height / rootHeight : 1;
      const padding = 3;
      const width = Math.min(rootWidth - 4, targetRect.width / scaleX + padding * 2);
      const height = Math.min(rootHeight - 4, targetRect.height / scaleY + padding * 2);
      const targetLeft = (targetRect.left - rootRect.left) / scaleX;
      const targetTop = (targetRect.top - rootRect.top) / scaleY;
      const nextFrame = {
        left: Math.max(2, Math.min(rootWidth - width - 2, targetLeft - padding)),
        top: Math.max(2, Math.min(rootHeight - height - 2, targetTop - padding)),
        width,
        height,
      };
      setFrame(nextFrame);

      const bubbleWidth = Math.min(rootWidth - 24, calloutRef.current?.offsetWidth || 300);
      const bubbleHeight = calloutRef.current?.offsetHeight || 280;
      const left = Math.max(12, Math.min(rootWidth - bubbleWidth - 12, nextFrame.left + nextFrame.width / 2 - bubbleWidth / 2));
      const preferAbove = nextFrame.top + nextFrame.height / 2 > rootHeight * 0.52;
      const desiredTop = preferAbove ? nextFrame.top - bubbleHeight - 15 : nextFrame.top + nextFrame.height + 15;
      setCallout({ left, top: Math.max(12, Math.min(rootHeight - bubbleHeight - 12, desiredTop)) });
    };

    const findTarget = () => {
      if (cancelled) return;
      const target = document.querySelector<HTMLElement>(activeStep.target);
      if (!target) {
        if (attempts++ < 30) {
          timer = window.setTimeout(findTarget, 100);
          return;
        }
        setTargetUnavailable(true);
        positionCenteredCallout();
        return;
      }
      highlightedTarget = target;
      target.classList.add('walkthrough-focus-target');
      animationFrame = window.requestAnimationFrame(() => measureTarget(target));
    };

    const onScroll = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const target = document.querySelector<HTMLElement>(activeStep.target);
        if (target) measureTarget(target);
      });
    };
    const scrollable = document.querySelector<HTMLElement>('.dawis-map-dialog-scroll');
    const mapFrame = document.querySelector<HTMLElement>('[data-map-tour="map"]');
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onScroll) : null;
    if (scrollable) resizeObserver?.observe(scrollable);
    if (mapFrame) resizeObserver?.observe(mapFrame);
    scrollable?.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    timer = window.setTimeout(findTarget, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      scrollable?.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      resizeObserver?.disconnect();
      highlightedTarget?.classList.remove('walkthrough-focus-target');
    };
  }, [activeStep]);

  const advanceStep = (direction: 'forward' | 'backward') => {
    setStepDirection(direction);
    setFrame(null);
    setTargetUnavailable(false);
    setStepIndex((current) => direction === 'forward' ? current + 1 : Math.max(current - 1, 0));
  };

  const paneStyles = frame ? [
    { top: 0, left: 0, width: '100%', height: frame.top },
    { top: frame.top + frame.height, left: 0, width: '100%', bottom: 0 },
    { top: frame.top, left: 0, width: frame.left, height: frame.height },
    { top: frame.top, left: frame.left + frame.width, right: 0, height: frame.height },
  ] : [{ inset: 0 }];

  return <div className="app-walkthrough dawis-map-walkthrough" ref={overlayRef}>
    {paneStyles.map((style, index) => <div className="app-walkthrough-scrim" style={style} key={index} />)}
    {frame && <div className="app-walkthrough-focus" aria-hidden="true" style={frame} />}
    <section ref={calloutRef} className="app-walkthrough-callout" style={callout} aria-label="Map walkthrough" aria-live="polite">
      <header>
        <div className="app-walkthrough-brand">
          {/* oxlint-disable-next-line next/no-img-element */}
          <img src="/mascot/mascot-wink.webp" alt="" aria-hidden="true" />
          <div><span>EXPLORE DIGOS</span><small>STEP {String(stepIndex + 1).padStart(2, '0')} OF {String(steps.length).padStart(2, '0')}</small></div>
        </div>
        <button type="button" onClick={onFinish}>Skip</button>
      </header>
      <div className="app-walkthrough-content">
        <div className={`app-walkthrough-copy is-${stepDirection}`} key={stepIndex}>
          <small className="app-walkthrough-context">{activeStep.context}</small>
          <h2>{activeStep.title}</h2>
          <p>{activeStep.body}</p>
        </div>
      </div>
      <div className="app-walkthrough-footer-wrap">
        <p className="app-walkthrough-hint">{targetUnavailable ? 'This part is not available right now. Continue to the next step.' : 'Explore the highlighted area, then tap Next.'}</p>
        <footer>
          <button type="button" className="app-walkthrough-back" disabled={stepIndex === 0} onClick={() => advanceStep('backward')}><ArrowLeft size={15} /> Back</button>
          <div className="app-walkthrough-progress" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>
            {steps.map((step, index) => <i className={index <= stepIndex ? 'is-complete' : ''} key={step.context} />)}
          </div>
          {stepIndex < steps.length - 1
            ? <button type="button" className="app-walkthrough-next" onClick={() => advanceStep('forward')}>Next <ArrowRight size={15} /></button>
            : <button type="button" className="app-walkthrough-next" onClick={onFinish}>Finish <ArrowRight size={15} /></button>}
        </footer>
      </div>
    </section>
  </div>;
}
