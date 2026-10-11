'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Award, Check, CheckCircle2, ChevronLeft, ChevronRight, Leaf, MapPin, Navigation, Trophy } from 'lucide-react';
import { loadQuestForSpot, type Destination, type SpotQuest } from '@/lib/digosar-data';
import { loadQuestProgress, saveQuestProgress, type SyncedQuestProgress } from '@/lib/quest-progress';
import { supabase } from '@/lib/supabase';
import { Progress } from '@/components/ui/progress';
import { RewardModelViewer } from '@/components/reward-model-viewer';
import { QuestMascotGuide } from '@/components/quest-mascot-guide';
import { Dialog } from '@base-ui/react/dialog';

type EcoDiscovery = {
  id: string;
  title: string;
  kicker: string;
  description: string;
  prompt: string;
  reward: string;
  modelSrc: string;
  markerSrc: string;
  pinClass: string;
  mapLabel: string;
};

type EcoQuestStage = 'map' | 'quiz' | 'complete';

const ECO_DISCOVERIES: EcoDiscovery[] = [
  {
    id: 'eco-trail-gateway',
    title: 'Eco Park Gateway',
    kicker: '01 · START THE GREEN TRAIL',
    description: 'Begin at the park entrance and follow the visitor path toward the lake, heritage tree, and Barling wrecks.',
    prompt: 'The Eco Trail Key is unlocked and ready to view in 3D.',
    reward: 'Eco Trail Key',
    modelSrc: '/ar/rewards/gold-key.glb',
    markerSrc: '/ar/targets/eco-quest/eco-trail-gateway.webp',
    pinClass: 'eco-gateway',
    mapLabel: 'Gateway',
  },
  {
    id: 'eco-lake-guardian',
    title: 'Park lake',
    kicker: '02 · THE WATER EDGE',
    description: 'Take in the lake and the park landscape around it. Notice how the paths and planted areas meet the water.',
    prompt: 'The Lake Guardian is unlocked and ready to view in 3D.',
    reward: 'Lake Guardian',
    modelSrc: '/ar/rewards/lake-guardian.glb',
    markerSrc: '/ar/targets/eco-quest/lake-guardian.webp',
    pinClass: 'eco-lake',
    mapLabel: 'Lake',
  },
  {
    id: 'eco-heritage-tree',
    title: 'Century-old Heritage Tree',
    kicker: '03 · A LIVING LANDMARK',
    description: 'Look at the heritage tree’s trunk and canopy from the visitor path. Follow any posted guidance around its roots.',
    prompt: 'The Heritage Tree is unlocked and ready to view in 3D.',
    reward: 'Heritage Tree',
    modelSrc: '/ar/rewards/century-tree.glb',
    markerSrc: '/ar/targets/eco-quest/heritage-tree.webp',
    pinClass: 'eco-tree',
    mapLabel: 'Heritage tree',
  },
  {
    id: 'eco-barling-wrecks',
    title: 'Barling wrecks',
    kicker: '04 · WRECKS BY THE PARK',
    description: 'Explore the Barling wrecks stop and observe the remains from the designated visitor area.',
    prompt: 'The Barling Wrecks are unlocked and ready to view in 3D.',
    reward: 'Barling Wrecks',
    modelSrc: '/ar/rewards/barling_wrecks.glb',
    markerSrc: '/ar/targets/eco-quest/barling-wrecks.webp',
    pinClass: 'eco-wrecks',
    mapLabel: 'Barling wrecks',
  },
];

const ECO_DISCOVERY_IDS = new Set(ECO_DISCOVERIES.map((item) => item.id));

function normalizeEcoDiscoveries(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((id): id is string => typeof id === 'string' && ECO_DISCOVERY_IDS.has(id))));
}

const EMPTY_PROGRESS: SyncedQuestProgress = {
  discoveries: [],
  quizCompleted: false,
  quizScore: 0,
  platformClue: null,
  completedAt: null,
};

export function EcoParkQuest({
  spot,
  userId,
  questUnlocked,
  compassEnabled,
  compassHeading,
  compassStatus,
  onBack,
  onComplete,
  onScanTarget,
  onToggleCompass,
}: {
  spot: Destination;
  userId?: string;
  questUnlocked: boolean;
  compassEnabled: boolean;
  compassHeading: number | null;
  compassStatus: 'idle' | 'waiting' | 'active' | 'unavailable' | 'denied';
  onBack: () => void;
  onComplete: (spot: Destination) => void | Promise<void>;
  onScanTarget: (targetId?: string) => void;
  onToggleCompass: () => void | Promise<void>;
}) {
  const [stage, setStage] = useState<EcoQuestStage>('map');
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const [quest, setQuest] = useState<SpotQuest | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedDiscovery, setSelectedDiscovery] = useState<string | null>(null);
  const [activeReward, setActiveReward] = useState<EcoDiscovery | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [sheetDragHeight, setSheetDragHeight] = useState<number | null>(null);
  const sheetDrag = useRef<{ startY: number; startHeight: number; min: number; max: number } | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const finishStarted = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const storageKey = `digosar:quest-progress:eco-park-green-quest:${userId ?? 'guest'}`;

  useEffect(() => {
    let active = true;

    void (async () => {
      await Promise.resolve();
      if (!active) return;
      setHydrated(false);
      setLoading(true);
      setErrorMessage('');
      setSaveMessage('');
      setQuest(null);
      setProgress(EMPTY_PROGRESS);
      setQuestionIndex(0);
      finishStarted.current = false;
      try {
        const [loadedQuest, synced] = await Promise.all([
          loadQuestForSpot(spot.id),
          userId && spot.id ? loadQuestProgress(userId, spot.id, 'eco-park-green-quest') : Promise.resolve(null),
        ]);
        if (!active) return;
        setQuest(loadedQuest);
        let loadedProgress: SyncedQuestProgress = {
          ...(synced?.progress ?? EMPTY_PROGRESS),
          discoveries: normalizeEcoDiscoveries(synced?.progress?.discoveries),
        };
        try {
          const localProgress = window.localStorage.getItem(storageKey);
          if (localProgress) {
            const saved = { ...EMPTY_PROGRESS, ...JSON.parse(localProgress) } as SyncedQuestProgress;
            loadedProgress = {
              ...(synced?.progress ? synced.progress : saved),
              discoveries: normalizeEcoDiscoveries([
                ...loadedProgress.discoveries,
                ...(Array.isArray(saved.discoveries) ? saved.discoveries : []),
              ]),
            };
          }
        } catch { /* Keep the in-memory defaults when local storage is unavailable. */ }
        setProgress(loadedProgress);
        const allStopsFound = ECO_DISCOVERIES.every((item) => loadedProgress.discoveries.includes(item.id));
        setStage(questUnlocked && loadedProgress.quizCompleted && allStopsFound ? 'complete' : 'map');
        if (!loadedQuest) setErrorMessage('The Eco Park quiz is not configured yet. Run the DigosAR seed in Supabase, then refresh.');
      } catch (error) {
        console.error('[DigosAR Eco Park Quest] Progress fetch failed', error);
        if (active) setErrorMessage('Eco Park quest data could not be loaded. Check the Supabase seed and quest progress migration.');
      } finally {
        if (active) {
          setHydrated(true);
          setLoading(false);
        }
      }
    })();

    return () => { active = false; };
  }, [questUnlocked, spot.id, storageKey, userId]);

  useEffect(() => {
    if (!hydrated) return;
    if (userId && quest?.id) {
      void saveQuestProgress(userId, quest.id, progress).catch((error) => {
        console.error('[DigosAR Eco Park Quest] Progress save failed', error);
        setSaveMessage('Progress could not be synced. Check your connection and try again.');
      });
      return;
    }
    if (!userId) {
      try { window.localStorage.setItem(storageKey, JSON.stringify(progress)); }
      catch { console.warn('[DigosAR Eco Park Quest] Browser storage is unavailable.'); }
    }
  }, [hydrated, progress, quest?.id, storageKey, userId]);

  useEffect(() => {
    if (!sheetExpanded || !selectedDiscovery) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`eco-quest-discovery-${selectedDiscovery}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [sheetExpanded, selectedDiscovery]);

  const currentQuestion = quest?.questions[questionIndex];
  const foundCount = ECO_DISCOVERIES.filter((item) => progress.discoveries.includes(item.id)).length;
  const visibleFoundCount = questUnlocked ? foundCount : 0;
  const nextDiscovery = ECO_DISCOVERIES.find((item) => !progress.discoveries.includes(item.id));
  const openDiscovery = (id: string) => {
    setSheetExpanded(true);
    setSelectedDiscovery(questUnlocked ? id : null);
  };

  const startQuiz = () => {
    if (!questUnlocked) return;
    setQuestionIndex(0);
    setSelectedOption(null);
    setAnswered(false);
    setWrong(false);
    setStage('quiz');
  };

  const handleTrailAction = () => {
    if (!questUnlocked) {
      onScanTarget('eco-park');
      return;
    }
    if (nextDiscovery) {
      setSheetExpanded(true);
      onScanTarget();
      return;
    }
    startQuiz();
  };

  const finishQuest = async () => {
    if (!questUnlocked || finishStarted.current || !quest) return;
    finishStarted.current = true;
    const completedAt = new Date().toISOString();
    setProgress((current) => ({ ...current, quizCompleted: true, quizScore: quest.questions.length, completedAt }));
    setStage('complete');

    if (!userId) {
      setSaveMessage('Sign in to save the Green Guardian badge and XP to your account.');
      await onComplete(spot);
      return;
    }

    const { error } = await supabase.from('quiz_attempts').insert({
      user_id: userId,
      quest_id: quest.id,
      score: quest.questions.length,
      total_questions: quest.questions.length,
      xp_earned: quest.xpReward,
      completed_at: completedAt,
    });
    let spotProgressError: { message: string } | null = null;
    if (!error && spot.id) {
      const result = await supabase.from('user_spot_progress').upsert({
        user_id: userId,
        tourist_spot_id: spot.id,
        status: 'completed',
        visit_count: 1,
        first_visited_at: completedAt,
        last_visited_at: completedAt,
        completed_at: completedAt,
      }, { onConflict: 'user_id,tourist_spot_id' });
      spotProgressError = result.error;
    }
    await onComplete(spot);
    setSaveMessage(error || spotProgressError ? 'Quest complete, but some progress could not be saved.' : 'Progress saved to your account.');
  };

  const checkAnswer = () => {
    if (!currentQuestion || !selectedOption) return;
    const choice = currentQuestion.options.find((option) => option.id === selectedOption);
    if (!answered) {
      if (!choice?.isCorrect) { setWrong(true); return; }
      setWrong(false);
      setAnswered(true);
      return;
    }
    if (questionIndex === (quest?.questions.length ?? 0) - 1) {
      void finishQuest();
      return;
    }
    setQuestionIndex((index) => index + 1);
    setSelectedOption(null);
    setAnswered(false);
    setWrong(false);
  };

  const expandSheetFromPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const sheet = event.currentTarget.closest<HTMLElement>('.quest-progress-sheet');
    if (!sheet?.parentElement) return;
    const parentHeight = sheet.parentElement.clientHeight;
    const min = window.innerWidth <= 360 ? 128 : 131;
    const max = Math.max(min, Math.min(parentHeight - 28, parentHeight * (window.innerWidth <= 360 ? 0.76 : 0.75)));
    sheetDrag.current = { startY: event.clientY, startHeight: sheet.getBoundingClientRect().height, min, max };
    setSheetDragHeight(sheet.getBoundingClientRect().height);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const dragSheet = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = sheetDrag.current;
    if (!drag) return;
    setSheetDragHeight(Math.max(drag.min, Math.min(drag.max, drag.startHeight + drag.startY - event.clientY)));
  };

  const releaseSheet = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = sheetDrag.current;
    if (!drag) return;
    const distance = drag.startY - event.clientY;
    if (Math.abs(distance) > 10) setSheetExpanded(distance > 0);
    sheetDrag.current = null;
    setSheetDragHeight(null);
  };

  return <div className={`screen quest-map-experience eco-park-quest ${stage !== 'map' ? 'eco-quest-screen' : ''}`}>
    {stage === 'map' && <>
      <header className="quest-map-topbar"><button type="button" onClick={onBack} aria-label="Back to quests"><ChevronLeft size={21} /></button><h1>Digos Quest</h1><span aria-hidden="true" /></header>
      <p className="quest-map-subtitle">Explore. Discover. Complete the Trail.</p>
      <div className="quest-map-route-summary"><span><Leaf size={24} /></span><div><strong>Eco Park Green Quest</strong><small>4 stops <i /> AR discoveries <i /> 3D rewards + key</small></div></div>

      <div className="quest-map-stage">
        <section className="quest-full-map eco-quest-map" aria-label="Illustrated Eco Park trail preview" style={{ backgroundImage: "linear-gradient(180deg,rgba(7,35,28,.04),rgba(7,35,28,.2)),url('/ar/maps/eco-park-quest-map.webp')" }}>
          <span className="eco-map-preview-label"><Leaf size={12} /> ECO PARK TRAIL</span>
          {ECO_DISCOVERIES.map((item) => {
            const found = progress.discoveries.includes(item.id);
            const current = questUnlocked && !found && item.id === nextDiscovery?.id;
            const Icon = found ? Check : MapPin;
            return <button key={item.id} type="button" className={`quest-full-map-pin ${item.pinClass} ${found && questUnlocked ? 'is-done' : ''} ${current ? 'is-current' : ''} ${selectedDiscovery === item.id ? 'is-selected' : ''}`} onClick={() => openDiscovery(item.id)} aria-label={questUnlocked ? `Open ${item.title}${found ? ', completed' : ''}` : `${item.title}, locked until the Eco Park marker is scanned`} aria-controls="eco-quest-stops">
              <Icon size={29} fill="currentColor" /><small>{item.mapLabel}</small>
            </button>;
          })}
          <button type="button" className="quest-map-compass" onClick={() => void onToggleCompass()} aria-label={compassEnabled ? 'Disable device compass' : compassStatus === 'denied' ? 'Compass permission denied. Tap to try again.' : 'Enable device compass'} aria-pressed={compassEnabled} title={compassStatus === 'active' ? 'Device compass active' : compassStatus === 'unavailable' ? 'Device compass unavailable' : compassStatus === 'denied' ? 'Compass permission denied' : 'Tap to enable device compass'}>
            N<i><Navigation size={18} fill="currentColor" style={{ transform: `rotate(${compassHeading === null ? 0 : 360 - compassHeading}deg)` }} /></i>
            <output className="quest-map-compass-status" aria-live="polite">{compassStatus === 'waiting' ? 'Waiting for compass readings.' : compassStatus === 'active' ? 'Device compass active.' : compassStatus === 'unavailable' ? 'Device compass is unavailable.' : compassStatus === 'denied' ? 'Compass permission was denied.' : 'Compass is off.'}</output>
          </button>
        </section>

        <section className={`quest-progress-sheet ${sheetExpanded ? 'is-expanded' : ''} ${sheetDragHeight !== null ? 'is-dragging' : ''}`} aria-label="Eco Park trail progress and stops" style={sheetDragHeight === null ? undefined : { height: sheetDragHeight, transition: 'none' }}>
          <button
            type="button"
            className="quest-progress-sheet-handle"
            aria-expanded={sheetExpanded}
            aria-controls="eco-quest-stops"
            aria-label={`${sheetExpanded ? 'Collapse' : 'Expand'} Eco Park trail progress and stops`}
            onPointerDown={expandSheetFromPointer}
            onPointerMove={dragSheet}
            onPointerUp={releaseSheet}
            onPointerCancel={() => { sheetDrag.current = null; setSheetDragHeight(null); }}
            onLostPointerCapture={() => { sheetDrag.current = null; setSheetDragHeight(null); }}
            onClick={(event) => { if (event.detail === 0) setSheetExpanded((expanded) => !expanded); }}
            onKeyDown={(event) => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); setSheetExpanded(event.key === 'ArrowUp'); } }}
          >
            <span className="quest-progress-sheet-grabber" aria-hidden="true" />
            <span className="quest-map-progress-heading"><strong>Trail Progress</strong><span>{visibleFoundCount} / {ECO_DISCOVERIES.length}</span></span>
            <span className="quest-map-progress-track" aria-hidden="true">
              {ECO_DISCOVERIES.map((item, index) => <i key={item.id} className={visibleFoundCount > index ? 'is-done' : visibleFoundCount === index && visibleFoundCount < ECO_DISCOVERIES.length ? 'is-current' : ''} />)}
              <b className="quest-map-progress-fill" style={{ width: `${Math.min(visibleFoundCount / ECO_DISCOVERIES.length, 1) * 100}%` }} />
            </span>
          </button>
          <div className="quest-map-next-stop"><span><MapPin size={19} fill="currentColor" /></span><div><small>{!questUnlocked ? 'START HERE' : progress.quizCompleted ? 'QUEST COMPLETE' : nextDiscovery ? 'TARGETS · ANY ORDER' : 'QUIZ READY'}</small><strong>{!questUnlocked ? 'Eco Park marker' : nextDiscovery ? 'Scan any of the four markers' : 'Eco Park quiz'}</strong></div><button type="button" disabled={progress.quizCompleted && questUnlocked} onClick={handleTrailAction}>{!questUnlocked ? 'Scan Eco Park Marker' : progress.quizCompleted ? 'Completed' : nextDiscovery ? 'Scan Any Target' : 'Take the Quiz'} <ChevronRight size={17} /></button></div>
          <div className="quest-progress-sheet-content" id="eco-quest-stops" aria-hidden={!sheetExpanded && sheetDragHeight === null}>
            <section className="quest-discovery-panel quest-targets-on-map eco-targets-on-map">
              <div className="quest-panel-heading"><div><small>SCAN FOUR TARGETS</small><h2>What can you find?</h2></div><span>{visibleFoundCount}/4</span></div>
              <p className="quest-scan-instruction">{questUnlocked ? 'Find and scan all four markers in any order. Tap a scanned target to open its story, clue, and reward.' : 'Scan the Eco Park marker to unlock the four target markers and start your trail.'}</p>
              <div className="quest-discovery-list">
                {ECO_DISCOVERIES.map((item) => {
                  const found = progress.discoveries.includes(item.id);
                  const selected = selectedDiscovery === item.id;
                  return <article id={`eco-quest-discovery-${item.id}`} className={`quest-discovery ${found ? 'is-found' : ''} ${!questUnlocked ? 'is-locked' : ''} ${selected ? 'is-selected' : ''}`} key={item.id}>
                    <button type="button" disabled={!questUnlocked} onClick={() => setSelectedDiscovery(selected ? null : item.id)} aria-expanded={questUnlocked && selected} aria-label={questUnlocked ? `${selected ? 'Close' : 'Open'} ${item.title}` : `${item.title} locked until the Eco Park marker is scanned`}>
                      <span className="quest-discovery-icon">{/* oxlint-disable-next-line next/no-img-element */}<img src={item.markerSrc} alt="" aria-hidden="true" loading="lazy" /></span><span><small>{item.kicker}</small><strong>{item.title}</strong></span>{found && questUnlocked ? <CheckCircle2 size={20} /> : <ChevronRight size={18} />}
                    </button>
                    {selected && questUnlocked && <div className="eco-discovery-detail">
                      {!found ? <div className="quest-discovery-guide-preview">{/* oxlint-disable-next-line next/no-img-element */}<img src={item.markerSrc} alt={`${item.title} marker to find`} /><p>Find this marker in AR first. Scan it to reveal the story and 3D reward.</p></div> : <>
                        <p>{item.description}</p><small>{item.prompt}</small>
                        <button type="button" className="eco-reward-unlocked" onClick={() => setActiveReward(item)}><CheckCircle2 size={15} /> {item.reward} unlocked · View 3D</button>
                      </>}
                    </div>}
                  </article>;
                })}
              </div>
              {questUnlocked && foundCount === ECO_DISCOVERIES.length && <button className="quest-primary-button" type="button" onClick={startQuiz} disabled={progress.quizCompleted}>{progress.quizCompleted ? <>Quest completed <CheckCircle2 size={18} /></> : <>All stops found · Start quiz <ChevronRight size={18} /></>}</button>}
            </section>
          </div>
        </section>
      </div>
      <QuestMascotGuide initialMessage="Explore the Eco Park trail." secondaryMessage={questUnlocked ? `${foundCount} of 4 targets found. Scan any of the remaining markers in any order.` : 'Scan the Eco Park marker to unlock the trail targets.'} />
    </>}

    {stage === 'quiz' && <div className="eco-quest-standard-screen">
      <header className="light-header quest-explorer-header"><button type="button" onClick={() => setStage('map')} aria-label="Back to Eco Park trail"><ChevronLeft size={20} /></button><h1>Eco Park Quest</h1><span className="header-spacer" aria-hidden="true" /></header>
      {loading && <section className="quest-route-card eco-quest-state"><Leaf size={25} /><strong>Loading Eco Park quest…</strong></section>}
      {!loading && errorMessage && <section className="quest-route-card eco-quest-state"><Leaf size={25} /><strong>Quest data is not ready</strong><p>{errorMessage}</p></section>}
      {!loading && !errorMessage && currentQuestion && <section className="quest-quiz-panel eco-quest-quiz">
        <div className="quest-panel-heading"><button type="button" onClick={() => setStage('map')} aria-label="Back to Eco Park trail"><ChevronLeft size={18} /></button><div><small>ECO PARK GREEN CHECK</small><h2>Question {questionIndex + 1} of {quest?.questions.length}</h2></div><span>+{currentQuestion.xpReward} XP</span></div>
        <Progress value={((questionIndex + Number(answered)) / (quest?.questions.length || 1)) * 100} />
        <h3>{currentQuestion.text}</h3>
        <div className="quest-quiz-options">{currentQuestion.options.map((option, index) => <button type="button" key={option.id} className={`${selectedOption === option.id ? 'is-selected' : ''} ${answered && option.isCorrect ? 'is-correct' : ''}`} disabled={answered} onClick={() => { setSelectedOption(option.id); setWrong(false); }}><span>{String.fromCharCode(65 + index)}</span>{option.text}</button>)}</div>
        {wrong && <p className="quest-quiz-feedback wrong">Try again. Think about how visitors can care for the park.</p>}
        {answered && <p className="quest-quiz-feedback correct">{currentQuestion.explanation}</p>}
        <button className="quest-primary-button" type="button" disabled={!selectedOption} onClick={checkAnswer}>{answered ? questionIndex === (quest?.questions.length ?? 0) - 1 ? 'Claim Green Guardian badge' : 'Next question' : 'Check answer'} <ChevronRight size={18} /></button>
      </section>}
    </div>}

    {stage === 'complete' && <div className="eco-quest-standard-screen">
      <header className="light-header quest-explorer-header"><button type="button" onClick={onBack} aria-label="Back to quests"><ChevronLeft size={20} /></button><h1>Eco Park Quest</h1><span className="header-spacer" aria-hidden="true" /></header>
      <section className="quest-complete-panel eco-quest-complete">
        <div className="quest-badge-art"><Award size={34} /><span>GREEN</span></div><small>ECO PARK QUEST COMPLETE</small><h2>Green Guardian</h2><p>You explored the park trail and completed its green check.</p>
        <div className="quest-reward-row"><span><Trophy size={16} /> Badge unlocked</span><strong>+{quest?.xpReward ?? 150} XP</strong></div>
        {saveMessage && <output className="eco-quest-save-message">{saveMessage}</output>}
        <button className="quest-primary-button" type="button" onClick={() => { setStage('map'); setSelectedDiscovery(null); setSheetExpanded(true); }}>Review discoveries <ChevronRight size={18} /></button>
      </section>
    </div>}

    <Dialog.Root open={activeReward !== null} onOpenChange={(open) => { if (!open) setActiveReward(null); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="quest-coming-soon-backdrop" />
        <Dialog.Popup className="quest-reward-dialog eco-reward-dialog">
          {activeReward && <>
            <header><div><small>REWARD UNLOCKED</small><Dialog.Title>{activeReward.reward}</Dialog.Title></div><Dialog.Close aria-label="Close reward viewer">×</Dialog.Close></header>
            <Dialog.Description className="sr-only">A collectible for the {activeReward.title} stop in the Eco Park quest.</Dialog.Description>
            <RewardModelViewer key={activeReward.id} modelSrc={activeReward.modelSrc} title={activeReward.reward} description={`A 3D keepsake from the ${activeReward.title.toLowerCase()} stop.`} />
          </>}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  </div>;
}
