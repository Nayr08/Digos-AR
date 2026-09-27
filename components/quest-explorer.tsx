'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Anchor, Award, Check, CheckCircle2, ChevronLeft, ChevronRight,
  Compass, KeyRound, Landmark, LockKeyhole, Map as MapIcon, MapPin, Navigation, Route, Scan, ScrollText,
  Sparkles, Trophy, Waves,
} from 'lucide-react';
import type { Destination } from '@/lib/digosar-data';
import { loadDawisQuestProgress, saveDawisQuestProgress, type SyncedQuestProgress } from '@/lib/quest-progress';
import { supabase } from '@/lib/supabase';
import { Progress } from '@/components/ui/progress';
import { QuestMascotGuide } from '@/components/quest-mascot-guide';
import { RewardModelViewer } from '@/components/reward-model-viewer';
import { Dialog } from '@base-ui/react/dialog';

type QuestStage = 'map' | 'discoveries' | 'quiz' | 'complete';
type QuestProgress = {
  discoveries: string[];
  quizCompleted: boolean;
  quizScore: number;
  platformClue: string | null;
};

type Discovery = {
  id: string;
  title: string;
  kicker: string;
  description: string;
  hint: string;
  reward: string;
  rewardCopy: string;
  modelSrc: string;
  modelDescription: string;
  markerSrc: string;
  rewardIcon: typeof KeyRound;
};

const defaultProgress: QuestProgress = {
  discoveries: [],
  quizCompleted: false,
  quizScore: 0,
  platformClue: null,
};

const discoveries: Discovery[] = [
  {
    id: 'shoreline-rocks',
    title: 'Shoreline rocks',
    kicker: '01 · EDGE OF DAWIS',
    description: 'Rock clusters soften the shoreline and mark the transition from land to open water.',
    hint: 'The rocks mark the boundary where the beach becomes the wharf approach.',
    reward: 'Shoreline Key',
    rewardCopy: 'Your first collectible for the Dawis route.',
    modelSrc: '/ar/rewards/gold-key.glb?v=reward-key-viewer-1',
    modelDescription: 'A bright keepsake from the shoreline chapter of the Dawis route.',
    markerSrc: '/ar/targets/quest/shoreline-rocks.webp',
    rewardIcon: KeyRound,
  },
  {
    id: 'mooring-bollards',
    title: 'Rusted bollards',
    kicker: '02 · WORKING WHARF',
    description: 'These small metal fixtures helped boats hold position beside the concrete edge.',
    hint: 'Bollards are fixed points for securing a boat with a mooring line.',
    reward: 'Mooring Token',
    rewardCopy: 'A working-wharf token added to your collection.',
    modelSrc: '/ar/rewards/rusty-bollard.glb?v=reward-bollard-viewer-1',
    modelDescription: 'A weathered mooring fitting that kept boats steady beside the wharf.',
    markerSrc: '/ar/targets/quest/mooring-bollards.webp',
    rewardIcon: Anchor,
  },
  {
    id: 'support-piles',
    title: 'Pier support piles',
    kicker: '03 · BELOW THE SURFACE',
    description: 'Rows of concrete piles carry the pier above the water and reveal its utilitarian structure.',
    hint: 'The long deck stays above the water because of paired rows of concrete piles.',
    reward: 'Underdeck Lens',
    rewardCopy: 'A structure lens that reveals what holds the pier up.',
    modelSrc: '/ar/rewards/sonar-scanner.glb?v=reward-lens-viewer-1',
    modelDescription: 'A scanning lens for seeing the support structure below the deck.',
    markerSrc: '/ar/targets/quest/support-piles.webp',
    rewardIcon: ScrollText,
  },
  {
    id: 'terminal-platform',
    title: 'Terminal platform',
    kicker: '04 · THE LANDING',
    description: 'The widened end gave people room to pause, meet, and look across the gulf.',
    hint: 'The broadest part of the wharf sits at the seaward end.',
    reward: 'Old Dawis',
    rewardCopy: 'Congratulations! You found Old Dawis.',
    modelSrc: '/ar/models/old-dawis-wharf-refinement2.glb?v=historical-preview-1',
    modelDescription: 'Congratulations! You found Old Dawis. Explore this 3D reconstruction of the old Dawis wharf.',
    markerSrc: '/ar/targets/quest/terminal-platform.webp',
    rewardIcon: Landmark,
  },
];

const platformClues = [
  'The widened end opens toward the sea.',
  'The terminal platform is broader than the long pier.',
  'The wharf becomes widest where visitors face the gulf.',
];

function buildQuizQuestions(platformClue: string | null) {
  return [
    {
      question: 'What carries the long pier above the water?',
      options: ['Decorative railings', 'Concrete support piles', 'A floating platform'],
      answer: 1,
      explanation: 'The paired rows of support piles carry the deck and terminal platform.',
    },
    {
      question: 'Where is the widened terminal platform?',
      options: ['At the seaward end', 'Under the shoreline', 'In the center of town'],
      answer: 0,
      explanation: 'The platform widens toward the seaward end so the wharf can hold more activity.',
    },
    {
      question: 'What were the rusted metal fixtures used for?',
      options: ['Lighting the path', 'Holding boats in place', 'Measuring the tide'],
      answer: 1,
      explanation: 'Mooring bollards give a line a sturdy point to hold a boat beside the wharf.',
    },
    ...(platformClue ? [{
      question: `Your platform clue says “${platformClue}” — what does it describe?`,
      options: ['The widened seaward terminal', 'The shoreline rocks', 'The support piles below the deck'],
      answer: 0,
      explanation: 'The clue points to the broad terminal platform at the seaward end of the wharf.',
    }] : []),
  ];
}

function TargetMarker({ source, title }: { source: string; title: string }) {
  return <div className="quest-target-marker">{/* oxlint-disable-next-line next/no-img-element */}<img src={source} alt={`${title} target marker`} /><a href={source} download>{`Save ${title} marker`}</a></div>;
}

function QuestHeader({ onBack, title = 'Quest' }: { onBack?: () => void; title?: string }) {
  return <header className="light-header quest-explorer-header">{onBack ? <button type="button" onClick={onBack} aria-label="Back to quests"><ChevronLeft size={20} /></button> : <span className="header-spacer" aria-hidden="true" />}<h1>{title}</h1><span className="header-spacer" aria-hidden="true" /></header>;
}

type QuestPresentation = { shortName: string; trailName: string; summary: string; stops: string[] };

const questPresentations: Record<string, QuestPresentation> = {
  'dawis-heritage-wharf': { shortName: 'Dawis Heritage Wharf', trailName: 'Dawis Coastal Trail', summary: 'Follow the shore and discover the stories of Dawis.', stops: ['Shoreline', 'Bollards', 'Pier', 'Platform'] },
  'rizal-park': { shortName: 'Rizal Park', trailName: 'Rizal Heritage Walk', summary: 'Explore the city landmark and its civic history.', stops: ['Park gate', 'Monument', 'Plaza'] },
  'digos-city-eco-park-arboretum': { shortName: 'Eco Park', trailName: 'Eco Park Nature Trail', summary: 'Discover the lake, gardens, and local trees.', stops: ['Lake', 'Canopy', 'Arboretum'] },
  'mary-mother-mediatrix-cathedral': { shortName: 'Mediatrix Cathedral', trailName: 'Mediatrix Heritage Visit', summary: 'Discover the cathedral and its place in Digos.', stops: ['Cathedral', 'Courtyard', 'Shrine'] },
};

function QuestPreviewCard({ spot, presentation, progress, isDawis, nextStop, onView }: { spot: Destination; presentation: QuestPresentation; progress: number; isDawis: boolean; nextStop: string; onView: () => void }) {
  const mapImage = isDawis ? '/ar/quest-dawis-map-current-v3.webp' : spot.image;
  return <section className="quest-preview-card">
    <div className="quest-preview-heading"><span><Route size={24} /></span><div><h2>{presentation.trailName}</h2><p>{presentation.stops.length} stops <i /> AR experiences <i /> rewards</p></div><ChevronRight size={23} /></div>
    <div className={`quest-preview-map ${isDawis ? 'is-dawis-map' : ''}`}>
      {/* oxlint-disable-next-line next/no-img-element */}<img className="quest-preview-map-image" src={mapImage} alt={`${presentation.trailName} route preview`} />
    </div>
    <div className="quest-preview-footer"><div className="quest-preview-footer-info"><div className="quest-preview-next-stop"><MapPin size={19} fill="currentColor" /><strong>Next stop: {nextStop}</strong></div><div className="quest-preview-progress"><strong>{progress}<span> / {presentation.stops.length} stops</span></strong><div className="quest-preview-track" aria-label={`${progress} of ${presentation.stops.length} stops complete`}>{presentation.stops.map((stop, index) => <i className={index < progress ? 'is-complete' : ''} key={stop} />)}</div></div></div><button type="button" className="quest-preview-action" onClick={onView}>View Quest <ChevronRight size={21} /></button></div>
  </section>;
}

function RewardToken({ item, found, onOpen }: { item: Discovery; found: boolean; onOpen?: () => void }) {
  const RewardIcon = item.rewardIcon;
  const token = <><span><RewardIcon size={17} /></span><small>{found ? item.reward : 'Locked'}</small></>;
  if (onOpen && found) return <button className="quest-reward-token is-found" type="button" onClick={onOpen} title={`Open ${item.reward}`}>{token}</button>;
  return <div className={`quest-reward-token ${found ? 'is-found' : ''}`} title={found ? item.reward : 'Locked reward'}>{token}</div>;
}

function QuestTargetsPanel({
  progress,
  questUnlocked,
  selectedDiscovery,
  onSelect,
  onBack,
  onScanTarget,
  onDigClue,
  onOpenReward,
  onUseClue,
}: {
  progress: QuestProgress;
  questUnlocked: boolean;
  selectedDiscovery: string | null;
  onSelect: (id: string | null) => void;
  onBack?: () => void;
  onScanTarget: () => void;
  onDigClue: () => void;
  onOpenReward: (item: Discovery) => void;
  onUseClue: () => void;
}) {
  const discoveredCount = progress.discoveries.length;
  const quizReady = discoveredCount === discoveries.length;
  return <section className={`quest-discovery-panel quest-targets-panel ${onBack ? '' : 'quest-targets-on-map'}`}>
    <div className="quest-panel-heading">{onBack && <button type="button" onClick={onBack} aria-label="Back to route"><ChevronLeft size={18} /></button>}<div><small>SCAN FOUR TARGETS</small><h2>What can you find?</h2></div><span>{discoveredCount}/4</span></div>
    <p className="quest-scan-instruction">{questUnlocked ? 'Find and scan all four markers in any order. Tap a scanned target to open its story, clue, and reward.' : 'Scan the Dawis Wharf marker to unlock the four target markers and start your trail.'}</p>
    <div className="quest-discovery-list" id="quest-discovery-list">{discoveries.map((item) => {
      const found = progress.discoveries.includes(item.id);
      const RewardIcon = item.rewardIcon;
      const isPlatform = item.id === 'terminal-platform';
      const isSelected = selectedDiscovery === item.id;
      return <article className={`quest-discovery ${found ? 'is-found' : ''} ${!questUnlocked ? 'is-locked' : ''} ${isSelected ? 'is-selected' : ''}`} id={`quest-discovery-${item.id}`} key={item.id}>
        <button type="button" disabled={!questUnlocked} onClick={() => onSelect(isSelected ? null : item.id)} aria-expanded={questUnlocked && isSelected} aria-label={questUnlocked ? `${isSelected ? 'Close' : 'Open'} ${item.title}` : `${item.title} locked until the Dawis marker is scanned`}>
          <span className="quest-discovery-icon">{/* oxlint-disable-next-line next/no-img-element */}<img src={item.markerSrc} alt="" aria-hidden="true" loading="lazy" /></span><span><small>{item.kicker}</small><strong>{item.title}</strong></span>{found ? <CheckCircle2 size={20} /> : <ChevronRight size={18} />}
        </button>
        {isSelected && questUnlocked && <div className="quest-discovery-detail">
          {!found ? <div className="quest-discovery-guide-preview">{/* oxlint-disable-next-line next/no-img-element */}<img src={item.markerSrc} alt={`${item.title} marker to find`} /><p>Find this marker in AR first. The picture above shows what to scan; its story and reward unlock when it is recognized.</p></div> : <>
            <TargetMarker source={item.markerSrc} title={item.title} />
            <p>{item.description}</p>
            {found && <div className="quest-discovery-hint"><Sparkles size={15} /><span><small>QUIZ HINT</small>{item.hint}</span></div>}
            {found && <div className="quest-discovery-reward"><span className="quest-reward-icon"><RewardIcon size={17} /></span><span className="quest-reward-copy"><small>REWARD UNLOCKED</small><strong>{item.reward}</strong><em>{item.rewardCopy}</em></span><button type="button" aria-label={`Open the 3D ${item.reward}`} onClick={() => onOpenReward(item)}>View 3D</button></div>}
            {isPlatform && found && (progress.platformClue ? <div className="quest-platform-clue"><ScrollText size={17} /><span><small>YOUR DUG CLUE</small><strong>{progress.platformClue}</strong></span></div> : <button className="quest-clue-button" type="button" onClick={onDigClue}><ScrollText size={15} /> Dig for a clue</button>)}
            <span><CheckCircle2 size={14} /> Target scanned</span>
          </>}
        </div>}
      </article>;
    })}</div>
    {onBack && questUnlocked && discoveredCount < discoveries.length && <button className="quest-scan-any-target" type="button" onClick={onScanTarget}><Scan size={16} /> Scan any target in AR <ChevronRight size={16} /></button>}
    <button className="quest-primary-button" type="button" disabled={!quizReady || progress.quizCompleted} onClick={onUseClue}>{progress.quizCompleted ? 'Completed' : progress.platformClue ? 'Use your clue in the heritage quiz' : 'Start the heritage quiz'} <ChevronRight size={18} /></button>
  </section>;
}

function RouteMap({ progress, onSelect }: { progress: QuestProgress; onSelect: (next: QuestStage) => void }) {
  const discoveriesDone = progress.discoveries.length;
  const isFound = (id: string) => progress.discoveries.includes(id);
  return <section className="quest-route-card">
    <div className="quest-route-top"><div><small>YOUR EXPLORER MAP</small><h2>Dawis waterfront route</h2></div><span><Compass size={16} /> {discoveriesDone}/4</span></div>
    <div className="quest-route-map" aria-label="Dawis waterfront route from beach through shoreline, bollards, pier, and terminal platform">
      <div className="quest-route-water"><i /><i /><i /></div><div className="quest-route-beach" /><div className="quest-route-shore" /><div className="quest-route-pier" /><div className="quest-route-terminal" />
      <svg className="quest-route-path" viewBox="0 0 420 210" preserveAspectRatio="none" aria-hidden="true"><path d="M42 176 C88 165 75 135 126 126 S168 86 214 96 S249 54 292 64 S321 104 372 46" /><path d="M42 176 C88 165 75 135 126 126 S168 86 214 96 S249 54 292 64 S321 104 372 46" /></svg>
      <button className="quest-route-node node-start is-done" type="button" onClick={() => onSelect('map')}><span><MapPin size={16} /></span><small>BEACH</small></button>
      <button className={`quest-route-node node-shore ${isFound('shoreline-rocks') ? 'is-done' : 'is-active'}`} type="button" onClick={() => onSelect('discoveries')}><span>{isFound('shoreline-rocks') ? <Check size={16} /> : <Waves size={16} />}</span><small>SHORELINE</small></button>
      <button className={`quest-route-node node-bollards ${isFound('mooring-bollards') ? 'is-done' : ''}`} type="button" onClick={() => onSelect('discoveries')}><span>{isFound('mooring-bollards') ? <Check size={16} /> : <Anchor size={16} />}</span><small>BOLLARDS</small></button>
      <button className={`quest-route-node node-pier ${isFound('support-piles') ? 'is-done' : ''}`} type="button" onClick={() => onSelect('discoveries')}><span>{isFound('support-piles') ? <Check size={16} /> : <Scan size={16} />}</span><small>PIER</small></button>
      <button className={`quest-route-node node-platform ${isFound('terminal-platform') ? 'is-done' : ''}`} type="button" onClick={() => onSelect('discoveries')}><span>{isFound('terminal-platform') ? <Check size={16} /> : <Compass size={16} />}</span><small>PLATFORM</small></button>
    </div>
    <div className="quest-route-footer"><span><i className="route-dot done" /> Completed</span><span><i className="route-dot next" /> Next stop</span><span><i className="route-dot locked" /> Locked</span></div>
  </section>;
}

export function QuestExplorer({
  spots,
  unlockedSlugs,
  questUnlocked,
  scanSpot,
  userId,
  onComplete,
  resumeQuest = false,
  onResumeQuestConsumed,
}: {
  spots: Destination[];
  unlockedSlugs: string[];
  questUnlocked: boolean;
  scanSpot: (spot: Destination) => void;
  userId?: string;
  onComplete: (spot: Destination) => void | Promise<void>;
  openQuiz: (spot: Destination) => void;
  resumeQuest?: boolean;
  onResumeQuestConsumed?: () => void;
}) {
  const dawis = useMemo(() => spots.find((spot) => spot.slug === 'dawis-heritage-wharf') ?? spots[0], [spots]);
  const questSpots = useMemo(() => {
    const bySlug = new Map(spots.map((spot) => [spot.slug, spot]));
    return ['dawis-heritage-wharf', 'rizal-park', 'digos-city-eco-park-arboretum', 'mary-mother-mediatrix-cathedral']
      .map((slug) => bySlug.get(slug))
      .filter((spot): spot is Destination => Boolean(spot));
  }, [spots]);
  const [view, setView] = useState<'list' | 'active'>(() => resumeQuest ? 'active' : 'list');
  const resumedAtMountRef = useRef(resumeQuest);
  const [expandedQuestSlug, setExpandedQuestSlug] = useState<string | null>(null);
  const [comingSoonQuest, setComingSoonQuest] = useState<string | null>(null);
  const [stage, setStage] = useState<QuestStage>('map');
  const [progressState, setProgressState] = useState<QuestProgress>(defaultProgress);
  const [questId, setQuestId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [syncReadyKey, setSyncReadyKey] = useState<string | null>(null);
  const [syncError, setSyncError] = useState('');
  const [selectedDiscovery, setSelectedDiscovery] = useState<string | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizChoice, setQuizChoice] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [activeReward, setActiveReward] = useState<Discovery | null>(null);
  const [questSheetExpanded, setQuestSheetExpanded] = useState(false);
  const [compassEnabled, setCompassEnabled] = useState(false);
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [compassStatus, setCompassStatus] = useState<'idle' | 'waiting' | 'active' | 'unavailable' | 'denied'>('idle');
  const sheetDrag = useRef<{ startY: number; startHeight: number; min: number; max: number } | null>(null);
  const [sheetDragHeight, setSheetDragHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!questSheetExpanded || !selectedDiscovery) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`quest-discovery-${selectedDiscovery}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [questSheetExpanded, selectedDiscovery]);

  useEffect(() => {
    if (!compassEnabled) return;
    let receivedHeading = false;
    const onOrientation = (rawEvent: Event) => {
      const event = rawEvent as DeviceOrientationEvent & { webkitCompassHeading?: number | null };
      const heading = typeof event.webkitCompassHeading === 'number'
        ? event.webkitCompassHeading
        : event.absolute && typeof event.alpha === 'number'
          ? (360 - event.alpha + 360) % 360
          : null;
      if (heading === null || !Number.isFinite(heading)) return;
      receivedHeading = true;
      setCompassHeading(Math.round(heading) % 360);
      setCompassStatus('active');
    };
    const unavailableTimer = window.setTimeout(() => {
      if (!receivedHeading) {
        setCompassStatus('unavailable');
        setCompassEnabled(false);
      }
    }, 2500);
    window.addEventListener('deviceorientation', onOrientation);
    window.addEventListener('deviceorientationabsolute', onOrientation);
    return () => {
      window.clearTimeout(unavailableTimer);
      window.removeEventListener('deviceorientation', onOrientation);
      window.removeEventListener('deviceorientationabsolute', onOrientation);
    };
  }, [compassEnabled]);

  useEffect(() => {
    if (resumeQuest && resumedAtMountRef.current) {
      resumedAtMountRef.current = false;
      onResumeQuestConsumed?.();
    }
  }, [resumeQuest, onResumeQuestConsumed]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setHydrated(false);
      setSyncReadyKey(null);
      setSyncError('');
      setProgressState(defaultProgress);
      setQuestId(null);
      if (!userId || !dawis?.id) {
        setHydrated(true);
        return;
      }
      try {
        const synced = await loadDawisQuestProgress(userId, dawis.id);
        if (!active) return;
        if (!synced) {
          setHydrated(true);
          setSyncError('The Dawis quest is not configured in Supabase yet.');
          return;
        }
        const saved = synced.progress ?? defaultProgress;
        setQuestId(synced.questId);
        setProgressState(saved);
        setStage(saved.quizCompleted ? 'complete' : saved.discoveries.length === discoveries.length && saved.platformClue ? 'quiz' : 'map');
        setSyncReadyKey(`${userId}:${synced.questId}`);
      } catch (error) {
        console.error('[DigosAR Quest] Progress fetch failed', error);
        if (active) setSyncError('Quest progress could not be loaded. Check the Supabase migration.');
      } finally {
        if (active) setHydrated(true);
      }
    };
    void load();
    return () => { active = false; };
  }, [dawis?.id, userId]);

  useEffect(() => {
    if (!hydrated || !userId || !questId || syncReadyKey !== `${userId}:${questId}`) return;
    const synced: SyncedQuestProgress = { ...progressState, completedAt: progressState.quizCompleted ? new Date().toISOString() : null };
    void saveDawisQuestProgress(userId, questId, synced).catch((error) => {
      console.error('[DigosAR Quest] Progress save failed', error);
      setSyncError('Progress could not be saved. Check your connection and try again.');
    });
  }, [hydrated, progressState, questId, syncReadyKey, userId]);

  const updateProgress = (next: QuestProgress) => setProgressState(next);
  const quizQuestions = useMemo(() => buildQuizQuestions(progressState.platformClue), [progressState.platformClue]);
  const currentQuestion = quizQuestions[quizIndex];
  const revealPlatformClue = () => {
    if (progressState.platformClue) return;
    const clue = platformClues[Math.floor(Math.random() * platformClues.length)];
    updateProgress({ ...progressState, platformClue: clue });
  };
  const answerQuiz = () => {
    if (quizChoice === null) return;
    if (quizChoice !== currentQuestion.answer) {
      setQuizFeedback('wrong');
      return;
    }
    setQuizFeedback('correct');
    window.setTimeout(() => {
      if (quizIndex === quizQuestions.length - 1) {
        const next = { ...progressState, quizCompleted: true, quizScore: quizQuestions.length };
        updateProgress(next);
        setStage('complete');
        void (async () => {
          if (userId && questId) {
            const { error } = await supabase.from('quiz_attempts').insert({
              user_id: userId,
              quest_id: questId,
              score: quizQuestions.length,
              total_questions: quizQuestions.length,
              xp_earned: 100,
              completed_at: new Date().toISOString(),
            });
            if (error) {
              console.error('[DigosAR Quest] Quiz completion save failed', error);
              setSyncError('The quiz finished, but its score could not be saved.');
            }
          }
          if (dawis) await onComplete(dawis);
        })();
        return;
      }
      setQuizIndex((index) => index + 1);
      setQuizChoice(null);
      setQuizFeedback(null);
    }, 520);
  };

  if (!dawis) return null;
  const discoveredCount = progressState.discoveries.length;
  const nextDiscovery = discoveries.find((item) => !progressState.discoveries.includes(item.id));
  const openNextStop = () => {
    if (progressState.quizCompleted) return;
    if (!questUnlocked) { scanSpot(dawis); return; }
    if (nextDiscovery) {
      scanSpot(dawis);
      return;
    }
    setQuizIndex(0);
    setQuizChoice(null);
    setQuizFeedback(null);
    setStage('quiz');
  };
  const openMapDiscovery = (discoveryId: string) => {
    setQuestSheetExpanded(true);
    if (questUnlocked) setSelectedDiscovery(discoveryId);
  };
  const toggleCompass = async () => {
    if (compassEnabled) {
      setCompassEnabled(false);
      setCompassHeading(null);
      setCompassStatus('idle');
      return;
    }
    if (!('DeviceOrientationEvent' in window)) {
      setCompassStatus('unavailable');
      return;
    }
    try {
      const orientationApi = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
      if (orientationApi.requestPermission && await orientationApi.requestPermission() !== 'granted') {
        setCompassStatus('denied');
        return;
      }
      setCompassHeading(null);
      setCompassStatus('waiting');
      setCompassEnabled(true);
    } catch {
      setCompassStatus('denied');
    }
  };
  const guideTarget = discoveries.find((item) => item.id === selectedDiscovery);
  const guide = !questUnlocked
    ? { message: 'Start at Dawis.', detail: 'Scan the main Dawis marker to unlock your first quest.' }
    : progressState.quizCompleted || stage === 'complete'
    ? { message: 'Dawis quest completed!', detail: 'You finished the heritage quiz and unlocked your explorer achievement.' }
    : stage === 'quiz'
      ? { message: 'You know the structure now.', detail: 'Answer the questions to finish this route.' }
        : stage === 'discoveries'
        ? { message: 'Scan each target in any order.', detail: `${discoveredCount} of 4 target scans completed.` }
        : guideTarget && !progressState.discoveries.includes(guideTarget.id)
          ? { message: `Find ${guideTarget.title}.`, detail: 'Use the marker picture in this row to recognize it. Scan any target in AR to unlock its details.' }
          : discoveredCount === discoveries.length
            ? { message: 'All four targets found!', detail: 'Your heritage quiz is ready. Open it whenever you are.' }
            : discoveredCount === 0
              ? { message: 'Your Dawis trail is open!', detail: 'Find all four target markers in any order, then take the heritage quiz.' }
              : { message: `${discoveredCount} of 4 targets found!`, detail: 'Scan the remaining markers in any order. Scanned rows open their stories and rewards.' };

  const rewardDialog = <Dialog.Root open={activeReward !== null} onOpenChange={(open) => { if (!open) setActiveReward(null); }}>
    <Dialog.Portal>
      <Dialog.Backdrop className="quest-coming-soon-backdrop" />
      <Dialog.Popup className="quest-reward-dialog">
        {activeReward && <>
          <header><div><small>REWARD UNLOCKED</small><Dialog.Title>{activeReward.reward}</Dialog.Title></div><Dialog.Close aria-label="Close 3D reward viewer">×</Dialog.Close></header>
          <Dialog.Description className="sr-only">{activeReward.rewardCopy}</Dialog.Description>
          <RewardModelViewer key={activeReward.id} modelSrc={activeReward.modelSrc} title={activeReward.reward} description={activeReward.modelDescription} />
        </>}
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;

  if (view === 'list') return <div className="screen quest-explorer quest-board-screen">
    <section className="quest-board-hero"><div className="quest-board-hero-copy"><h1>Challenges</h1><p>Explore trails. Complete quests.</p></div><span className="quest-board-mascot" aria-hidden="true" /></section>
    <section className="quest-board-panel" aria-label="Your Digos adventures"><h2 className="quest-board-section-title">YOUR DIGOS ADVENTURES</h2><div className="quest-challenge-list" aria-label="Digos quests">
      {questSpots.map((questSpot) => {
        const presentation = questPresentations[questSpot.slug] ?? { shortName: questSpot.name, trailName: `${questSpot.name} Quest`, summary: questSpot.description, stops: ['Discover', 'Explore', 'Learn'] };
        const questIsReady = questSpot.slug === dawis.slug ? questUnlocked : unlockedSlugs.includes(questSpot.slug);
        const progress = questSpot.slug === dawis.slug ? discoveredCount : 0;
        const isExpanded = expandedQuestSlug === questSpot.slug;
        const isDawisQuest = questSpot.slug === dawis.slug;
        const nextStop = isDawisQuest && !questUnlocked ? 'Shoreline' : presentation.stops[Math.min(progress, presentation.stops.length - 1)];
        return <div className={isExpanded ? 'quest-challenge-entry is-expanded' : 'quest-challenge-entry'} key={questSpot.slug}>
          <button type="button" className="quest-challenge-row" onClick={() => setExpandedQuestSlug(isExpanded ? null : questSpot.slug)} aria-expanded={isExpanded} aria-label={`${isExpanded ? 'Close' : 'Open'} ${presentation.shortName} quest`}>
            <span className="quest-challenge-thumb" style={{ backgroundImage: `url('${questSpot.image}')` }}><small>{questSpot.type}</small></span>
            <span className="quest-challenge-copy"><strong>{presentation.shortName}</strong><small>{isDawisQuest || questIsReady ? presentation.summary : questSpot.slug === 'digos-city-eco-park-arboretum' ? 'Discover nature and earn rewards' : 'Scan markers to unlock'}</small><span className="quest-challenge-progress"><span>{progress} / {presentation.stops.length} stops</span><i aria-hidden="true">{presentation.stops.map((stop, index) => <b className={index < progress ? 'is-complete' : ''} key={stop} />)}</i></span></span>
            <span className="quest-challenge-side"><b><Sparkles size={12} /> +{questSpot.xpReward} XP</b><ChevronRight className={isExpanded ? 'is-expanded' : ''} size={19} /></span>
          </button>
          {isExpanded && <QuestPreviewCard spot={questSpot} presentation={presentation} progress={progress} isDawis={isDawisQuest} nextStop={nextStop} onView={() => {
            if (isDawisQuest) setView('active');
            else setComingSoonQuest(presentation.shortName);
          }} />}
        </div>;
      })}
    </div></section>
    <Dialog.Root open={comingSoonQuest !== null} onOpenChange={(open) => { if (!open) setComingSoonQuest(null); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="quest-coming-soon-backdrop" />
        <Dialog.Popup className="quest-coming-soon-modal">
          <Compass size={32} aria-hidden="true" />
          <Dialog.Title>Coming soon</Dialog.Title>
          <Dialog.Description>{comingSoonQuest} quests are still being prepared. Explore the Dawis Heritage Wharf quest for now!</Dialog.Description>
          <Dialog.Close className="quest-coming-soon-close">Got it</Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  </div>;

  // Saved progress can hydrate before the parent unlock flag; keep locked visits on the new map route.
  if (view === 'active' && (!questUnlocked || stage === 'map')) return <div className="screen quest-map-experience">
    <header className="quest-map-topbar"><button type="button" onClick={() => setView('list')} aria-label="Back to quests"><ChevronLeft size={21} /></button><h1>Digos Quest</h1><span aria-hidden="true"><MapIcon size={20} /></span></header>
    <p className="quest-map-subtitle">Explore. Discover. Complete the Trail.</p>
    <div className="quest-map-route-summary"><span><Route size={24} /></span><div><strong>Dawis Coastal Trail</strong><small>4 stops <i /> AR experiences <i /> Real rewards</small></div></div>
    <div className="quest-map-stage">
      <section className="quest-full-map" aria-label="Dawis Coastal Trail map" style={{ backgroundImage: "linear-gradient(180deg,rgba(7,35,28,.03),rgba(7,35,28,.08)),url('/ar/quest-dawis-map-current-v5.webp')" }}>
      <button type="button" className={`quest-full-map-pin shoreline ${progressState.discoveries.includes('shoreline-rocks') ? 'is-done' : !discoveredCount ? 'is-current' : ''}`} onClick={() => openMapDiscovery('shoreline-rocks')} aria-label="Open Shoreline rocks target" aria-controls="quest-discovery-list"><MapPin size={29} fill="currentColor" /><small>Shoreline</small></button>
      <button type="button" className={`quest-full-map-pin bollards ${progressState.discoveries.includes('mooring-bollards') ? 'is-done' : discoveredCount === 1 ? 'is-current' : ''}`} onClick={() => openMapDiscovery('mooring-bollards')} aria-label="Open Rusted bollards target" aria-controls="quest-discovery-list"><MapPin size={29} fill="currentColor" /><small>Bollards</small></button>
      <button type="button" className={`quest-full-map-pin pier ${progressState.discoveries.includes('support-piles') ? 'is-done' : discoveredCount === 2 ? 'is-current' : ''}`} onClick={() => openMapDiscovery('support-piles')} aria-label="Open Pier support piles target" aria-controls="quest-discovery-list"><MapPin size={29} fill="currentColor" /><small>Pier</small></button>
      <button type="button" className={`quest-full-map-pin platform ${progressState.discoveries.includes('terminal-platform') ? 'is-done' : discoveredCount >= 3 ? 'is-current' : ''}`} onClick={() => openMapDiscovery('terminal-platform')} aria-label="Open Terminal platform target" aria-controls="quest-discovery-list"><MapPin size={29} fill="currentColor" /><small>Platform</small></button>
      <button type="button" className="quest-map-compass" onClick={toggleCompass} aria-label={compassEnabled ? 'Disable device compass' : compassStatus === 'denied' ? 'Compass permission denied. Tap to try again.' : 'Enable device compass'} aria-pressed={compassEnabled} title={compassStatus === 'active' ? 'Device compass active' : compassStatus === 'unavailable' ? 'Device compass unavailable' : compassStatus === 'denied' ? 'Compass permission denied' : 'Tap to enable device compass'}>
        N<i><Navigation size={18} fill="currentColor" style={{ transform: `rotate(${compassHeading === null ? 0 : 360 - compassHeading}deg)` }} /></i>
        <output className="quest-map-compass-status" aria-live="polite">{compassStatus === 'waiting' ? 'Waiting for compass readings.' : compassStatus === 'active' ? 'Device compass active.' : compassStatus === 'unavailable' ? 'Device compass is unavailable.' : compassStatus === 'denied' ? 'Compass permission was denied.' : 'Compass is off.'}</output>
      </button>
      </section>
      <section className={`quest-progress-sheet ${questSheetExpanded ? 'is-expanded' : ''} ${sheetDragHeight !== null ? 'is-dragging' : ''}`} aria-label="Trail progress and quest targets" style={sheetDragHeight === null ? undefined : { height: sheetDragHeight, transition: 'none' }}>
        <button
          type="button"
          className="quest-progress-sheet-handle"
          aria-expanded={questSheetExpanded}
          aria-controls="quest-progress-sheet-content"
          aria-label={`${questSheetExpanded ? 'Collapse' : 'Expand'} trail progress and quest targets`}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            const sheet = event.currentTarget.closest<HTMLElement>('.quest-progress-sheet');
            if (!sheet?.parentElement) return;
            const parentHeight = sheet.parentElement.clientHeight;
            const min = window.innerWidth <= 360 ? 128 : 131;
            const max = Math.max(min, Math.min(parentHeight - 28, parentHeight * (window.innerWidth <= 360 ? 0.76 : 0.75)));
            sheetDrag.current = { startY: event.clientY, startHeight: sheet.getBoundingClientRect().height, min, max };
            setSheetDragHeight(sheet.getBoundingClientRect().height);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const drag = sheetDrag.current;
            if (!drag) return;
            setSheetDragHeight(Math.max(drag.min, Math.min(drag.max, drag.startHeight + drag.startY - event.clientY)));
          }}
          onPointerUp={(event) => {
            const drag = sheetDrag.current;
            if (!drag) return;
            const distance = drag.startY - event.clientY;
            if (Math.abs(distance) > 10) setQuestSheetExpanded(distance > 0);
            sheetDrag.current = null;
            setSheetDragHeight(null);
          }}
          onPointerCancel={() => { sheetDrag.current = null; setSheetDragHeight(null); }}
          onLostPointerCapture={() => { sheetDrag.current = null; setSheetDragHeight(null); }}
          onClick={(event) => { if (event.detail === 0) setQuestSheetExpanded((expanded) => !expanded); }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
              event.preventDefault();
              setQuestSheetExpanded(event.key === 'ArrowUp');
            }
          }}
        >
          <span className="quest-progress-sheet-grabber" aria-hidden="true" />
          <span className="quest-map-progress-heading"><strong>Trail Progress</strong><span>{discoveredCount} / 4</span></span>
          <span className="quest-map-progress-track" aria-hidden="true">
            <i className={discoveredCount > 0 ? 'is-done' : 'is-current'} />
            <i className={discoveredCount > 1 ? 'is-done' : ''} />
            <i className={discoveredCount > 2 ? 'is-done' : ''} />
            <i className={discoveredCount > 3 ? 'is-done' : ''} />
            <b className="quest-map-progress-fill" style={{ width: `${Math.min(discoveredCount / 4, 1) * 100}%` }} />
          </span>
        </button>
        <div className="quest-map-next-stop"><span><MapPin size={19} fill="currentColor" /></span><div><small>{progressState.quizCompleted ? 'QUEST COMPLETE' : questUnlocked ? nextDiscovery ? 'TARGETS · ANY ORDER' : 'QUIZ READY' : 'START HERE'}</small><strong>{questUnlocked ? nextDiscovery ? 'Scan any of the four markers' : 'Heritage quiz' : 'Dawis Wharf marker'}</strong></div><button type="button" disabled={progressState.quizCompleted} onClick={() => { if (questUnlocked) setQuestSheetExpanded(true); openNextStop(); }}>{progressState.quizCompleted ? 'Completed' : questUnlocked ? nextDiscovery ? 'Scan Any Target' : 'Take the Quiz' : 'Scan Dawis Marker'} <ChevronRight size={17} /></button></div>
        <div className="quest-progress-sheet-content" id="quest-progress-sheet-content" aria-hidden={!questSheetExpanded && sheetDragHeight === null}>
          <QuestTargetsPanel progress={progressState} questUnlocked={questUnlocked} selectedDiscovery={selectedDiscovery} onSelect={setSelectedDiscovery} onScanTarget={() => scanSpot(dawis)} onDigClue={revealPlatformClue} onOpenReward={setActiveReward} onUseClue={() => { setQuizIndex(0); setQuizChoice(null); setQuizFeedback(null); setStage('quiz'); }} />
        </div>
      </section>
    </div>
    {questUnlocked && <QuestMascotGuide initialMessage={guide.message} secondaryMessage={guide.detail} />}
    {rewardDialog}
  </div>;

  return <div className="screen quest-explorer">
    <div className="quest-explorer-head"><QuestHeader onBack={() => setStage('map')} /><div className="quest-title-row"><div><small>{questUnlocked ? 'THE DAWIS WHARF WALK' : 'START AT THE LANDMARK'}</small><h1>{questUnlocked ? 'Discover what remains.' : 'Find the Dawis marker.'}</h1><p>{questUnlocked ? 'Explore the shoreline, pier, and terminal platform to earn your first heritage badge.' : 'Scan the main Dawis Heritage Wharf marker first. Your quest unlocks after the landmark is recognized.'}</p></div></div><Progress value={questUnlocked ? ((discoveredCount + (progressState.quizCompleted ? 1 : 0)) / 5) * 100 : 0} /></div>

    <section className="quest-explorer-body">
      {syncError && <output className="quest-sync-note">{syncError}</output>}
      {!questUnlocked && <section className="quest-gate-card">
        <div className="quest-gate-icon"><LockKeyhole size={24} /></div>
        <small>QUEST LOCKED</small>
        <h2>Scan Dawis to begin</h2>
        <p>The Dawis Wharf Walk opens when you scan the main Dawis marker in AR. After it is recognized, this route and its four discovery markers will be ready.</p>
        <button className="quest-primary-button" type="button" onClick={() => scanSpot(dawis)}><Scan size={17} /> Scan the Dawis marker</button>
      </section>}
      {questUnlocked && <RouteMap progress={progressState} onSelect={setStage} />}

      {questUnlocked && stage === 'map' && <>
        <section className="quest-collection-card"><header><div><small>YOUR COLLECTION</small><h2>{discoveredCount} of 4 rewards found</h2></div><KeyRound size={18} /></header><div className="quest-reward-rail">{discoveries.map((item) => <RewardToken item={item} found={progressState.discoveries.includes(item.id)} onOpen={() => setActiveReward(item)} key={item.id} />)}</div></section>
        <section className="quest-mission-card"><div className="quest-mission-icon"><Waves size={22} /></div><div><small>ACTIVE QUEST</small><h2>The Dawis Wharf Walk</h2><p>Follow the beach-to-wharf route and collect a reward and quiz hint at every marker.</p><div className="quest-mission-meta"><span><Sparkles size={13} /> +100 XP</span><span><Compass size={13} /> {discoveredCount}/4 clues</span></div></div></section>
        {progressState.platformClue && <div className="quest-clue-card"><span><ScrollText size={18} /></span><div><small>PLATFORM CLUE UNLOCKED</small><strong>{progressState.platformClue}</strong></div></div>}
        <button className="quest-primary-button" type="button" onClick={() => { if (discoveredCount === discoveries.length) { setQuizIndex(0); setQuizChoice(null); setQuizFeedback(null); setStage('quiz'); } else scanSpot(dawis); }}>{discoveredCount === discoveries.length ? 'Take the Quiz' : 'Scan Any Target'} <ChevronRight size={18} /></button>
        <button className="quest-scan-link" type="button" onClick={() => scanSpot(dawis)}><Scan size={14} /> Re-scan the Dawis marker in AR</button>
      </>}

      {questUnlocked && stage === 'discoveries' && <QuestTargetsPanel progress={progressState} questUnlocked={questUnlocked} selectedDiscovery={selectedDiscovery} onSelect={setSelectedDiscovery} onBack={() => setStage('map')} onScanTarget={() => scanSpot(dawis)} onDigClue={revealPlatformClue} onOpenReward={setActiveReward} onUseClue={() => { setQuizIndex(0); setQuizChoice(null); setQuizFeedback(null); setStage('quiz'); }} />}

      {questUnlocked && stage === 'quiz' && <section className="quest-quiz-panel"><div className="quest-panel-heading"><button type="button" onClick={() => setStage('discoveries')} aria-label="Back to discoveries"><ChevronLeft size={18} /></button><div><small>HERITAGE CHECK</small><h2>Question {quizIndex + 1} of {quizQuestions.length}</h2></div><span>+20 XP</span></div><Progress value={((quizIndex + (quizFeedback === 'correct' ? 1 : 0)) / quizQuestions.length) * 100} /><h3>{currentQuestion.question}</h3><div className="quest-quiz-options">{currentQuestion.options.map((option, index) => <button type="button" key={option} className={`${quizChoice === index ? 'is-selected' : ''} ${quizFeedback === 'correct' && index === currentQuestion.answer ? 'is-correct' : ''}`} disabled={quizFeedback === 'correct'} onClick={() => { setQuizChoice(index); setQuizFeedback(null); }}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>{quizFeedback === 'wrong' && <p className="quest-quiz-feedback wrong">Try again and look back at the route clues.</p>}{quizFeedback === 'correct' && <p className="quest-quiz-feedback correct">{currentQuestion.explanation}</p>}<button className="quest-primary-button" type="button" disabled={quizChoice === null} onClick={answerQuiz}>{quizFeedback === 'correct' && quizIndex === quizQuestions.length - 1 ? 'Claim badge' : quizFeedback === 'correct' ? 'Next question' : 'Check answer'} <ChevronRight size={18} /></button></section>}

      {questUnlocked && stage === 'complete' && <section className="quest-complete-panel"><div className="quest-badge-art"><Award size={34} /><span>DAWIS</span></div><small>QUEST COMPLETE</small><h2>Dawis Wharf Explorer</h2><p>You uncovered all four structural clues and completed the heritage check.</p><div className="quest-reward-row"><span><Trophy size={16} /> Badge unlocked</span><strong>+100 XP</strong></div><button className="quest-primary-button" type="button" onClick={() => { setStage('discoveries'); setSelectedDiscovery(null); }}>Review discoveries <ChevronRight size={18} /></button></section>}

    </section>
    <QuestMascotGuide initialMessage={guide.message} secondaryMessage={guide.detail} />
    {rewardDialog}
  </div>;
}
