'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

type GuideScreen = 'home' | 'explore' | 'details' | 'ar' | 'quest' | 'profile';
type WalkthroughStep = {
  screen: GuideScreen;
  target?: string;
  mode: 'action' | 'manual';
  context: string;
  title: string;
  body: string;
};
type GuideFrame = { left: number; top: number; width: number; height: number };

const walkthroughSteps: WalkthroughStep[] = [
  {
    screen: 'home',
    target: '[data-tour="nav-explore"]',
    mode: 'action',
    context: 'GETTING STARTED',
    title: 'Explore places around Digos',
    body: 'Tap Explore in the bottom navigation to browse local destinations.',
  },
  {
    screen: 'explore',
    target: '[data-tour="explore-spot"]',
    mode: 'action',
    context: 'EXPLORE · BROWSE PLACES',
    title: 'Open Dawis Heritage Wharf',
    body: 'Tap the Dawis card to see its story, visitor details, and ways to explore.',
  },
  {
    screen: 'details',
    target: '[data-tour="spot-story"]',
    mode: 'manual',
    context: 'PLACE DETAILS · LEARN',
    title: 'Read the place story',
    body: 'Swipe up through this sheet to read the history, cultural details, and visitor note. Tap Next when you’re ready.',
  },
  {
    screen: 'details',
    target: '[data-tour="spot-go"]',
    mode: 'manual',
    context: 'EXPLORE MAP · GET DIRECTIONS',
    title: 'See Dawis on the map',
    body: 'Tap GO to open the map with Dawis selected. Close the map when you’re done, then tap Next.',
  },
  {
    screen: 'details',
    target: '[data-tour="spot-quest"]',
    mode: 'action',
    context: 'PLACE DETAILS · START A QUEST',
    title: 'Open the Dawis quest',
    body: 'Tap Quest to see the Dawis trail and its rewards.',
  },
  {
    screen: 'quest',
    target: '[data-tour="quest-dawis-row"]',
    mode: 'action',
    context: 'QUEST · CHOOSE A TRAIL',
    title: 'Open Dawis Coastal Trail',
    body: 'Tap the Dawis quest row to reveal its trail preview.',
  },
  {
    screen: 'quest',
    target: '[data-tour="quest-preview-view"]',
    mode: 'action',
    context: 'QUEST · TRAIL PREVIEW',
    title: 'View the trail',
    body: 'Tap View Quest to open the Dawis trail map and its four discovery stops.',
  },
  {
    screen: 'quest',
    target: '[data-tour="quest-scan"]',
    mode: 'action',
    context: 'QUEST · SCAN A MARKER',
    title: 'Open the AR scanner',
    body: 'Tap Scan Dawis Marker to open the camera. At the wharf, aim it at the main DigosAR marker.',
  },
  {
    screen: 'ar',
    mode: 'manual',
    context: 'AR SCANNER · ON SITE',
    title: 'Find the marker',
    body: 'Allow camera access when asked. At Dawis, point the camera at the printed DigosAR marker and hold steady. You can try scanning when you visit.',
  },
  {
    screen: 'home',
    target: '[data-tour="nav-profile"]',
    mode: 'action',
    context: 'PROFILE · YOUR PROGRESS',
    title: 'Check your progress',
    body: 'Tap Profile in the bottom navigation to see your XP and achievements.',
  },
  {
    screen: 'profile',
    target: '[data-tour="profile-progress"]',
    mode: 'manual',
    context: 'PROFILE · TRACK YOUR PROGRESS',
    title: 'See what you have earned',
    body: 'Your level, XP, visited places, challenges, and badges are collected here. Tap Finish when you’re ready to explore on your own.',
  },
];

type FirstUseGuideProps = {
  open: boolean;
  onFinish: () => void;
  onNavigate: (screen: GuideScreen) => void;
};

export function FirstUseGuide({ open, onFinish, onNavigate }: FirstUseGuideProps) {
  if (!open) return null;
  return <AppWalkthrough onFinish={onFinish} onNavigate={onNavigate} />;
}

function AppWalkthrough({ onFinish, onNavigate }: Omit<FirstUseGuideProps, 'open'>) {
  const [stepIndex, setStepIndex] = useState(0);
  const [stepDirection, setStepDirection] = useState<'forward' | 'backward'>('forward');
  const [frame, setFrame] = useState<GuideFrame | null>(null);
  const [callout, setCallout] = useState({ left: 12, top: 48 });
  const [targetReady, setTargetReady] = useState(false);
  const [targetUnavailable, setTargetUnavailable] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const calloutRef = useRef<HTMLDialogElement>(null);
  const activeStep = walkthroughSteps[stepIndex];

  const advanceStep = useCallback((direction: 'forward' | 'backward') => {
    setStepDirection(direction);
    setFrame(null);
    setTargetReady(false);
    setTargetUnavailable(false);
    setStepIndex((current) => direction === 'forward'
      ? Math.min(current + 1, walkthroughSteps.length - 1)
      : Math.max(current - 1, 0));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    let measureTimer = 0;
    let attempts = 0;
    let animationFrame = 0;
    let eventTarget: HTMLElement | null = null;
    let handledAction = false;
    onNavigate(activeStep.screen);

    const positionCenteredCallout = () => {
      const root = overlayRef.current;
      if (!root) return;
      const rootRect = root.getBoundingClientRect();
      const rootWidth = root.clientWidth || rootRect.width;
      const rootHeight = root.clientHeight || rootRect.height;
      const bubbleWidth = Math.min(rootWidth - 24, calloutRef.current?.offsetWidth || 300);
      const bubbleHeight = calloutRef.current?.offsetHeight || 280;
      setCallout({
        left: Math.max(12, (rootWidth - bubbleWidth) / 2),
        top: Math.max(12, (rootHeight - bubbleHeight) / 2),
      });
    };

    const getTargetBounds = (target: HTMLElement): DOMRectReadOnly | null => {
      const nav = target.closest<HTMLElement>('.bottom-nav');
      const navBounds = nav?.getBoundingClientRect() ?? null;
      const buttons = nav ? Array.from(nav.querySelectorAll('button')) : [];
      const cellWidth = navBounds && buttons.length ? navBounds.width / buttons.length : 0;
      if (nav && navBounds) {
        // Spotlight the tab's visible icon and label instead of its full-width
        // button cell, while keeping the button itself as the click target.
        const visualChildren = Array.from(target.children).filter((child): child is HTMLElement =>
          child instanceof HTMLElement && (child.tagName === 'SPAN' || child.tagName === 'SMALL'),
        );
        const visibleBounds = visualChildren
          .map(child => child.getBoundingClientRect())
          .filter(bounds => bounds.width >= 4 && bounds.height >= 4);
        if (visibleBounds.length) {
          const left = Math.min(...visibleBounds.map(bounds => bounds.left));
          const top = Math.min(...visibleBounds.map(bounds => bounds.top));
          const right = Math.max(...visibleBounds.map(bounds => bounds.right));
          const bottom = Math.max(...visibleBounds.map(bounds => bounds.bottom));
          const horizontalRoom = Math.max(0, Math.min(8, (cellWidth - (right - left)) / 2));
          const verticalRoom = Math.max(0, Math.min(6, (navBounds.height - (bottom - top)) / 2));
          return new DOMRect(left - horizontalRoom, top - verticalRoom, right - left + horizontalRoom * 2, bottom - top + verticalRoom * 2);
        }
      }

      const bounds = target.getBoundingClientRect();
      if (bounds.width >= 8 && bounds.height >= 8) return bounds;

      // Fixed/absolute navigation can report a collapsed child rect in an iOS
      // Home Screen viewport. Recover the tab's grid cell from the visible nav.
      if (!nav || !navBounds) return null;
      const index = buttons.indexOf(target as HTMLButtonElement);
      if (index < 0 || buttons.length === 0 || navBounds.width < 8 || navBounds.height < 8) return null;
      const focusWidth = Math.min(56, cellWidth - 8);
      const focusHeight = Math.min(56, navBounds.height - 8);
      return new DOMRect(
        navBounds.left + cellWidth * index + (cellWidth - focusWidth) / 2,
        navBounds.top + (navBounds.height - focusHeight) / 2,
        focusWidth,
        focusHeight,
      );
    };

    const measureTarget = (target: HTMLElement) => {
      const root = overlayRef.current;
      if (cancelled || !root || !target.isConnected) return;
      const rootRect = root.getBoundingClientRect();
      const targetRect = getTargetBounds(target);
      if (!targetRect) {
        setFrame(null);
        setTargetUnavailable(true);
        positionCenteredCallout();
        return;
      }
      // A scaled preview (or an iOS display-mode viewport) reports visual pixels
      // from getBoundingClientRect but positions children in the overlay's CSS pixels.
      const rootWidth = root.clientWidth || root.offsetWidth || rootRect.width;
      const rootHeight = root.clientHeight || root.offsetHeight || rootRect.height;
      const scaleX = rootWidth ? rootRect.width / rootWidth : 1;
      const scaleY = rootHeight ? rootRect.height / rootHeight : 1;
      const padding = 3;
      const targetLeft = (targetRect.left - rootRect.left) / scaleX;
      const targetTop = (targetRect.top - rootRect.top) / scaleY;
      const width = Math.min(rootWidth - 4, targetRect.width / scaleX + padding * 2);
      const height = Math.min(rootHeight - 4, targetRect.height / scaleY + padding * 2);
      const nextFrame = {
        left: Math.max(2, Math.min(rootWidth - width - 2, targetLeft - padding)),
        top: Math.max(2, Math.min(rootHeight - height - 2, targetTop - padding)),
        width,
        height,
      };
      setFrame(nextFrame);

      const bubbleWidth = Math.min(rootWidth - 24, calloutRef.current?.offsetWidth || 300);
      const bubbleHeight = calloutRef.current?.offsetHeight || 280;
      const targetCenter = nextFrame.left + nextFrame.width / 2;
      const left = Math.max(12, Math.min(rootWidth - bubbleWidth - 12, targetCenter - bubbleWidth / 2));
      const preferAbove = nextFrame.top + nextFrame.height / 2 > rootHeight * 0.52;
      const desiredTop = preferAbove ? nextFrame.top - bubbleHeight - 15 : nextFrame.top + nextFrame.height + 15;
      const top = Math.max(12, Math.min(rootHeight - bubbleHeight - 12, desiredTop));
      setCallout({ left, top });
    };

    const handleTargetAction = () => {
      if (handledAction || cancelled) return;
      handledAction = true;
      setTargetReady(true);
      window.setTimeout(() => advanceStep('forward'), 100);
    };

    const onScroll = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const target = activeStep.target ? document.querySelector<HTMLElement>(activeStep.target) : null;
        if (target) measureTarget(target);
      });
    };
    const onResize = () => {
      const target = activeStep.target ? document.querySelector<HTMLElement>(activeStep.target) : null;
      if (target) measureTarget(target);
      else positionCenteredCallout();
    };

    const findTarget = () => {
      if (cancelled) return;
      const overlay = overlayRef.current;
      if (!overlay) {
        timer = window.setTimeout(findTarget, 100);
        return;
      }
      if (!activeStep.target) {
        positionCenteredCallout();
        return;
      }
      const target = document.querySelector<HTMLElement>(activeStep.target);
      if (!target) {
        if (attempts++ < 34) {
          timer = window.setTimeout(findTarget, 100);
          return;
        }
        setTargetUnavailable(true);
        positionCenteredCallout();
        return;
      }

      // The startup logo intentionally hides the bottom bar. Wait for its
      // transition to finish instead of spotlighting the hidden button at (0, 0).
      const targetBounds = getTargetBounds(target);
      if (!targetBounds) {
        if (attempts++ < 34) {
          timer = window.setTimeout(findTarget, 100);
          return;
        }
        setTargetUnavailable(true);
        positionCenteredCallout();
        return;
      }

      eventTarget = target;
      target.classList.add('walkthrough-focus-target');
      if (activeStep.mode === 'action') {
        target.addEventListener('click', handleTargetAction);
      }
      const overlayRect = overlay.getBoundingClientRect();
      const needsScroll = targetBounds.top < overlayRect.top + 38 || targetBounds.bottom > overlayRect.bottom - 38;
      const isFixedNavigationTarget = Boolean(target.closest('.bottom-nav'));
      if (needsScroll && !isFixedNavigationTarget) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        measureTimer = window.setTimeout(() => measureTarget(target), 380);
      } else {
        animationFrame = window.requestAnimationFrame(() => {
          animationFrame = window.requestAnimationFrame(() => measureTarget(target));
        });
      }

      const scrollable = document.querySelector<HTMLElement>('.app-content');
      scrollable?.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onResize);
    };

    timer = window.setTimeout(findTarget, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(measureTimer);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      eventTarget?.removeEventListener('click', handleTargetAction);
      eventTarget?.classList.remove('walkthrough-focus-target');
      document.querySelector<HTMLElement>('.app-content')?.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [activeStep, advanceStep, onNavigate]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onFinish();
      if (event.key === 'ArrowRight') advanceStep('forward');
      if (event.key === 'ArrowLeft') advanceStep('backward');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [advanceStep, onFinish]);

  const canAdvance = activeStep.mode === 'manual' || targetReady || targetUnavailable;
  const hint = targetUnavailable
    ? 'This control is not available right now. Tap Next to continue.'
    : activeStep.mode === 'action'
      ? 'Tap the highlighted control to continue.'
      : 'Complete this step, then tap Next.';
  const paneStyles = frame ? [
    { top: 0, left: 0, width: '100%', height: frame.top },
    { top: frame.top + frame.height, left: 0, width: '100%', bottom: 0 },
    { top: frame.top, left: 0, width: frame.left, height: frame.height },
    { top: frame.top, left: frame.left + frame.width, right: 0, height: frame.height },
  ] : [{ inset: 0 }];

  return <div className="app-walkthrough" ref={overlayRef}>
    {paneStyles.map((style, index) => <div className="app-walkthrough-scrim" style={style} key={index} />)}
    {frame && <div className="app-walkthrough-focus" aria-hidden="true" style={frame} />}
    <dialog
      open
      ref={calloutRef}
      className="app-walkthrough-callout"
      style={callout}
      aria-modal="true"
      aria-labelledby="walkthrough-title"
      aria-describedby="walkthrough-body"
    >
      <header>
        <div className="app-walkthrough-brand">
          {/* oxlint-disable-next-line next/no-img-element */}
          <img src="/mascot/mascot-wink.webp" alt="" aria-hidden="true" />
          <div><span>YOUR DIGOSAR GUIDE</span><small>STEP {String(stepIndex + 1).padStart(2, '0')} OF {String(walkthroughSteps.length).padStart(2, '0')}</small></div>
        </div>
        <button type="button" onClick={onFinish}>Skip</button>
      </header>
      <div className="app-walkthrough-content">
        <div className={`app-walkthrough-copy is-${stepDirection}`} key={stepIndex}>
          <small className="app-walkthrough-context">{activeStep.context}</small>
          <h2 id="walkthrough-title">{activeStep.title}</h2>
          <p id="walkthrough-body">{activeStep.body}</p>
        </div>
      </div>
      <div className="app-walkthrough-footer-wrap">
        <p className="app-walkthrough-hint">{hint}</p>
        <footer>
          <button type="button" className="app-walkthrough-back" disabled={stepIndex === 0} onClick={() => advanceStep('backward')}><ArrowLeft size={15} /> Back</button>
          <div className="app-walkthrough-progress" style={{ gridTemplateColumns: `repeat(${walkthroughSteps.length}, minmax(0, 1fr))` }} aria-label={`Step ${stepIndex + 1} of ${walkthroughSteps.length}`}>
            {walkthroughSteps.map((step, index) => <i className={index <= stepIndex ? 'is-complete' : ''} key={step.context} />)}
          </div>
          {stepIndex < walkthroughSteps.length - 1
            ? <button type="button" className="app-walkthrough-next" disabled={!canAdvance} onClick={() => advanceStep('forward')}>Next <ArrowRight size={15} /></button>
            : <button type="button" className="app-walkthrough-next" onClick={onFinish}>Finish <ArrowRight size={15} /></button>}
        </footer>
      </div>
    </dialog>
  </div>;
}
