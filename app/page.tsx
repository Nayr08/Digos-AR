'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { DawisNavigation } from '@/components/dawis-navigation';
import { MAP_DESTINATIONS, walkingUrl } from '@/lib/dawis-navigation';
import { ChevronDown } from 'lucide-react';
import {
  ArrowLeft, ArrowRight, Award, Bell, Box as Cube, Camera, CheckCircle2, ChevronRight,
  Clock3, Compass, Footprints, Gamepad2, Gift,
  History, Home, Info, Landmark, Leaf, LockKeyhole, LogOut, Map, MapPin, Medal, TreePine,
  Bookmark, Navigation, PlayCircle, Scan, Search, Settings, SlidersHorizontal, Sparkles, Star, Trophy, UserRound,
  Eye, EyeOff,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import {
  fallbackDestinations, loadProfileGameData, loadQuestForSpot, loadTouristSpots, loadWeeklyHeritageProgress,
  type Destination, type ProfileBadge, type ProfileGameData, type SpotQuest,
} from '@/lib/digosar-data';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { ARCameraScreen } from '@/components/ar-camera-screen';
import { ChallengeCard, type Challenge } from '@/components/challenge-card';
import { DawisModelViewer } from '@/components/dawis-model-viewer';
import { MascotGuide } from '@/components/mascot-guide';
import { QuestExplorer } from '@/components/quest-explorer';
import { SpotMascotGuide } from '@/components/spot-mascot-guide';
import { ProfileHero } from '@/components/profile-hero';
import { usernameToAuthEmail } from '@/lib/auth';
import { loadDawisQuestProgress, recordDawisQuestDiscovery } from '@/lib/quest-progress';

type Screen = 'home' | 'explore' | 'details' | 'ar' | 'quest' | 'quiz' | 'achievements' | 'profile' | 'navigation' | 'model';
type ProfileData = { display_name: string; username: string; total_xp: number; level: number };
type DashboardStats = { spots_visited: number; quizzes_completed: number; badges_earned: number };
type AchievementToast = { badgeNames: string[] };

const badgeIcons: Record<string, typeof Compass> = {
  compass: Compass,
  scan: Scan,
  trophy: Trophy,
  medal: Medal,
  waves: Map,
  leaf: Leaf,
  'book-open': Map,
  landmark: Landmark,
  mountain: Map,
};

const profileBadgeArtwork: Record<string, string> = {
  'first-explorer': '/profile/first-explorer.webp',
  'ar-explorer': '/profile/ar-explorer.webp',
  'quiz-master': '/profile/quiz-master.webp',
  'digos-explorer': '/profile/digos-explorer.webp',
  'coastal-storykeeper': '/profile/coastal-storykeeper.webp',
  'rizal-scholar': '/profile/rizal-scholar.webp',
  'green-guardian': '/profile/green-guardian.webp',
  'cathedral-guide': '/profile/cathedral-guide.webp',
};

function BadgeIcon({ badge, size = 20 }: { badge: ProfileBadge; size?: number }) {
  const Icon = badgeIcons[badge.icon ?? ''] ?? Award;
  return <Icon size={size} />;
}

const protectedScreens = new Set<Screen>(['home', 'quest', 'quiz', 'profile', 'achievements', 'navigation']);
const linkableScreens = new Set<Screen>(['home', 'explore', 'quest', 'profile', 'navigation']);

const destinations = fallbackDestinations;

const weeklyChallenge: Challenge = {
  id: 'heritage-weekly',
  title: 'Explore 3 Heritage Sites',
  description: 'Visit any 3 heritage tourist spots this week.',
  progress: 2,
  target: 3,
  rewardXP: 300,
  category: 'Heritage',
  type: 'weekly',
};

const homeMascotMessages = [
  { title: 'Ready for another adventure?', text: 'Discover Digos through AR.' },
  { title: 'Where should we go next?', text: 'Explore a new side of Digos today.' },
  { title: 'There’s more waiting to be discovered.', text: 'Pick a tourist spot and start exploring.' },
  { title: 'Your next story is just around the corner.', text: 'Let’s discover it together.' },
  { title: 'Up for something new?', text: 'Find a place, explore, and earn XP.' },
] as const;

const nav = [
  { screen: 'home' as Screen, label: 'Home', icon: Home },
  { screen: 'explore' as Screen, label: 'Explore', icon: Compass },
  { screen: 'ar' as Screen, label: 'AR', icon: Camera },
  { screen: 'quest' as Screen, label: 'Quest', icon: Trophy },
  { screen: 'profile' as Screen, label: 'Profile', icon: UserRound },
];

function Logo({ inverse = false }: { inverse?: boolean }) {
  return <div className={`logo ${inverse ? 'inverse' : ''}`}><span className="logo-pin"><MapPin size={15} /><i /></span><span>Digos<strong>AR</strong></span></div>;
}

function Photo({ spot, className = '', children }: { spot: Destination; className?: string; children?: React.ReactNode }) {
  return <div className={`photo ${className}`} style={{ backgroundImage: `url('${spot.image}')`, backgroundPosition: spot.position }}>{children}</div>;
}

function GlassIcon({ children, label, onClick, active = false }: { children: React.ReactNode; label: string; onClick?: () => void; active?: boolean }) {
  return <button className={`glass-icon ${active ? 'active' : ''}`} onClick={onClick} aria-label={label}>{children}</button>;
}

function LightHeader({ title, back, onBack, showAvatar = true }: { title: string; back?: boolean; onBack?: () => void; showAvatar?: boolean }) {
  return <header className="light-header">{back ? <button onClick={onBack} aria-label="Back"><ArrowLeft size={20} /></button> : <span className="header-spacer" aria-hidden="true" />}<h1>{title}</h1>{showAvatar ? <div className="mini-avatar">DR</div> : <span className="header-spacer" aria-hidden="true" />}</header>;
}

function HomeScreen({ go, open, spots, displayName, challengeProgress }: { go: (s: Screen) => void; open: (d: Destination) => void; spots: Destination[]; displayName: string; challengeProgress: number }) {
  const [query, setQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapDestination, setMapDestination] = useState(MAP_DESTINATIONS[0]);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning,' : hour < 18 ? 'Good afternoon,' : 'Good evening,';
  return <div className="screen home-screen">
    <div className="home-backdrop">
      <div className="image-shade" />
      <section className="home-copy home-greeting-hero">
        <div className="home-hero-header"><div className="home-hero-greeting"><span>{greeting}</span><strong>{displayName || 'Explorer'}!</strong></div><div className="home-notification-wrap"><button className="home-notification" type="button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}><Bell size={18} /></button>{notificationsOpen && <output className="home-notification-note">No new notifications.</output>}</div></div>
        <MascotGuide state="idle" title={homeMascotMessages[0].title} message={homeMascotMessages[0].text} rotatingMessages={homeMascotMessages} />
      </section>
      <label className="glass-search"><Search size={19} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tourist spots..." /><button onClick={() => go('explore')} aria-label="Search"><ChevronRight size={18} /></button></label>
      <section className="home-map-entry" aria-label="View the Digos map"><small><Map size={17} aria-hidden="true" /> VIEW MAP</small><div><span aria-hidden="true"><MapPin size={18} /></span><p><strong>Explore Digos</strong><small>Choose a spot and see directions.</small></p><button type="button" onClick={() => setMapOpen(true)}>View Map <ChevronRight size={16} /></button></div></section>
      <Dialog.Root open={mapOpen} onOpenChange={setMapOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="quest-coming-soon-backdrop" />
          <Dialog.Popup className="dawis-map-dialog">
            <header className="dawis-map-header"><div><small>EXPLORE DIGOS</small><Dialog.Title>{mapDestination.name}</Dialog.Title></div><Dialog.Close aria-label="Close map">×</Dialog.Close></header>
            <div className="dawis-map-dialog-scroll">
              <Dialog.Description className="dawis-map-intro">Check your location and distance to this destination.</Dialog.Description>
              <div className="map-destination-picker"><span id="map-destination-label">Destination</span>
                <SelectPrimitive.Root value={mapDestination.id} onValueChange={value => setMapDestination(MAP_DESTINATIONS.find(item => item.id === value) ?? MAP_DESTINATIONS[0])}>
                  <SelectPrimitive.Trigger className="map-destination-trigger" aria-labelledby="map-destination-label">
                    <SelectPrimitive.Value>{mapDestination.name}</SelectPrimitive.Value>
                    <SelectPrimitive.Icon><ChevronDown size={18} /></SelectPrimitive.Icon>
                  </SelectPrimitive.Trigger>
                  <SelectPrimitive.Portal>
                    <SelectPrimitive.Positioner className="map-destination-positioner" side="bottom" align="start" sideOffset={6}>
                      <SelectPrimitive.Popup className="map-destination-popup">
                        <SelectPrimitive.List>{MAP_DESTINATIONS.map(item => <SelectPrimitive.Item className="map-destination-option" key={item.id} value={item.id}>
                          <SelectPrimitive.ItemText>{item.name}</SelectPrimitive.ItemText>
                        </SelectPrimitive.Item>)}</SelectPrimitive.List>
                      </SelectPrimitive.Popup>
                    </SelectPrimitive.Positioner>
                  </SelectPrimitive.Portal>
                </SelectPrimitive.Root>
              </div>
              <DawisNavigation key={mapDestination.id} destination={mapDestination} />
            </div>
            <footer className="dawis-map-dialog-footer"><a href={walkingUrl(mapDestination)} target="_blank" rel="noopener noreferrer"><MapPin size={18} />Walking directions in Google Maps<ArrowRight size={18} /></a></footer>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <div className="popular-head"><div><small>CURATED FOR YOU</small><h2>Popular Tourist Spots</h2></div><button onClick={() => go('explore')}>View all</button></div>
      <div className="popular-rail">{spots.map((spot) => <button className="popular-card" aria-label={`Open ${spot.name}`} key={spot.slug} onClick={() => open(spot)}>
        <Photo spot={spot}><span className="card-bookmark" aria-hidden="true"><Bookmark size={18} /></span><div className="card-glass"><div><small>{spot.type}</small><h3>{spot.name}</h3><p><MapPin size={13} /> {spot.distance}</p></div><strong><Star size={15} fill="currentColor" /> +{spot.xpReward} XP</strong></div></Photo>
      </button>)}</div>
      <ChallengeCard challenge={{ ...weeklyChallenge, progress: challengeProgress }} onContinue={() => go('explore')} />
    </div>
  </div>;
}

function ExploreScreen({ open, spots }: { open: (d: Destination) => void; spots: Destination[] }) {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const normalizedQuery = query.trim().toLowerCase();
  const visible = useMemo(() => spots.filter(spot => {
    const matchesCategory = category === 'All'
      || (category === 'Parks' ? spot.name.toLowerCase().includes('park') : spot.type === category);
    const matchesQuery = !normalizedQuery
      || `${spot.name} ${spot.description} ${spot.location}`.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  }), [spots, category, normalizedQuery]);
  const cardTitle = (spot: Destination) => spot.slug === 'digos-city-eco-park-arboretum'
    ? 'Eco Park'
    : spot.slug === 'mary-mother-mediatrix-cathedral'
      ? 'Mediatrix Cathedral'
      : spot.name;
  const cardCategory = (spot: Destination) => spot.slug === 'dawis-heritage-wharf'
    ? 'Coastal'
    : spot.slug === 'rizal-park'
      ? 'Heritage'
      : spot.type;

  return <div className="screen explore-screen">
    <header className="explore-title-cap">
      <LightHeader title="Explore Digos" showAvatar={false} />
      <p>Places. Stories. In Augmented Reality.</p>
    </header>
    <div className="explore-controls-surface">
      <div className="explore-search-row">
        <label className="explore-search">
          <Search size={17} aria-hidden="true" />
          <input aria-label="Search tourist spots" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search destinations, landmarks..." />
        </label>
        <button type="button" className={`explore-filter-button ${category !== 'All' ? 'has-active-filter' : ''}`} aria-label={filtersOpen ? 'Hide category filters' : 'Show category filters'} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(open => !open)}><SlidersHorizontal size={18} /></button>
      </div>
      {filtersOpen && <div className="explore-chips" aria-label="Filter destinations">
        {['All', 'Nature', 'History', 'Parks'].map(item => {
          const Icon = item === 'Nature' ? Leaf : item === 'History' ? Landmark : item === 'Parks' ? TreePine : null;
          return <button type="button" className={category === item ? 'active' : ''} aria-pressed={category === item} onClick={() => setCategory(item)} key={item}>{Icon && <Icon size={11} aria-hidden="true" />}{item}</button>;
        })}
      </div>}
    </div>
    <section className="visual-list" aria-label="Tourist destinations">
      {visible.map(spot => <button className="visual-card explore-place-card" aria-label={`Explore ${spot.name}`} key={spot.slug} onClick={() => open(spot)}>
        <Photo spot={spot} className="explore-place-photo"><span className="explore-place-tag">{cardCategory(spot)}</span></Photo>
        <span className="explore-place-copy">
          <strong>{cardTitle(spot)}</strong>
          <span className="explore-place-description">{spot.description}</span>
          <span className="explore-place-arrow" aria-hidden="true"><ChevronRight size={17} /></span>
        </span>
      </button>)}
      {!visible.length && <div className="empty"><Search size={28} /><h2>No places found</h2><p>Try another name or category.</p></div>}
    </section>
  </div>;
}
function DetailsScreen({ spot, go }: { spot: Destination; go: (s: Screen) => void }) {
  const isDawis = spot.slug === 'dawis-heritage-wharf';
  const [modelComingSoon, setModelComingSoon] = useState(false);
  return <div className="screen detail-screen"><Photo spot={spot} className="detail-hero"><div className="image-shade" /><div className="detail-top"><GlassIcon label="Back" onClick={() => go('explore')}><ArrowLeft size={20} /></GlassIcon></div><div className="detail-image-title"><small>{spot.type} · {spot.distance}</small><h1>{spot.name}</h1></div></Photo>
    <article className="info-sheet"><span className="sheet-handle" aria-hidden="true" /><div className="spot-meta"><p><MapPin size={13} /> {spot.location}</p><span>+100 XP</span></div><h1>{spot.name}</h1><div className="fact-row"><div><Leaf size={17} /><span><small>Category</small><strong>{spot.type}</strong></span></div><div><Clock3 size={17} /><span><small>Best time</small><strong>{spot.best}</strong></span></div><div><Footprints size={17} /><span><small>Distance</small><strong>{spot.distance}</strong></span></div></div>
      <section className="story"><div className="story-kicker"><span><Sparkles size={13} /></span><small>ABOUT THIS PLACE</small></div><h2>A place worth knowing</h2><p>{spot.description}</p></section>
      <section className="story-columns" aria-label="Heritage highlights">
        <article className="story-card story-history-card"><div className="story-card-top"><span className="story-card-icon"><History size={18} /></span><small>PAST & PLACE</small></div><h3>History</h3><p>{spot.history}</p></article>
        <article className="story-card story-culture-card"><div className="story-card-top"><span className="story-card-icon"><Medal size={18} /></span><small>COMMUNITY</small></div><h3>Cultural significance</h3><p>{spot.culture}</p></article>
      </section>
      <div className="media-preview"><Photo spot={spot}><PlayCircle size={34} /><span><small>MULTIMEDIA PREVIEW</small><strong>Watch the local story</strong></span></Photo><button onClick={() => isDawis ? go('model') : setModelComingSoon(true)}><Cube size={18} /> View 3D Model</button></div>
      <div className={`detail-bottom-actions ${isDawis ? '' : 'is-coming-soon'}`}>
        {isDawis ? <><button onClick={() => go('quest')}><Gamepad2 size={18} /> Quest</button><button onClick={() => go('navigation')}><Navigation size={18} fill="currentColor" /> Go</button></> : <><button type="button" disabled aria-label="Quest coming soon"><Gamepad2 size={18} /><span>Quest</span><small>Coming soon</small></button><button type="button" disabled aria-label="Go coming soon"><Navigation size={18} fill="currentColor" /><span>Go</span><small>Coming soon</small></button></>}
      </div>
    </article><SpotMascotGuide initialMessage="Scroll down for more details about this spot!" />
    <Dialog.Root open={modelComingSoon} onOpenChange={setModelComingSoon}>
      <Dialog.Portal>
        <Dialog.Backdrop className="quest-coming-soon-backdrop" />
        <Dialog.Popup className="quest-coming-soon-modal">
          <Cube size={32} aria-hidden="true" />
          <Dialog.Title>Coming soon</Dialog.Title>
          <Dialog.Description>The 3D model for {spot.name} is still being prepared. Explore the Dawis Heritage Wharf model for now!</Dialog.Description>
          <Dialog.Close className="quest-coming-soon-close">Got it</Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  </div>;
}

function NavigationScreen({ spot, go }: { spot: Destination; go: (s: Screen) => void }) {
  return <div className="screen nav-preview"><Photo spot={spot} className="nav-photo"><div className="ar-shade" /><div className="ar-top"><GlassIcon label="Back" onClick={() => go('details')}><ArrowLeft size={20} /></GlassIcon><div><small>AR NAVIGATION</small><h1>Follow the trail</h1></div><GlassIcon label="Map"><Map size={19} /></GlassIcon></div><div className="nav-distance"><Navigation size={27} fill="currentColor" /><small>Continue straight</small><strong>120 m</strong><span>to {spot.name}</span></div><div className="route-arrows"><b>↑</b><b>↑</b><b>↑</b><b>↑</b></div><div className="ar-nav-card large"><Photo spot={spot} /><div><small>DESTINATION</small><strong>{spot.name}</strong><span><Clock3 size={12} /> 3 min · {spot.distance}</span></div><button onClick={() => go('ar')}>AR</button></div></Photo></div>;
}

function ModelScreen({ spot, go }: { spot: Destination; go: (s: Screen) => void }) {
  const isDawis = spot.slug === 'dawis-heritage-wharf';
  if (!isDawis) return <div className="screen model-screen"><LightHeader title="3D Preview" showAvatar={false} back onBack={() => go('details')} /><section className="model-coming-soon"><div className="model-coming-icon"><Cube size={38} /></div><small>INTERACTIVE MODEL</small><h1>{spot.name}</h1><h2>3D preview coming soon</h2><p>We’re preparing an interactive model for this destination. You can still explore its story, location, and AR preview today.</p><button type="button" onClick={() => go('details')}><ArrowLeft size={17} /> Back to {spot.name}</button></section></div>;
  return <div className="screen model-screen"><LightHeader title="3D Preview" showAvatar={false} back onBack={() => go('details')} /><DawisModelViewer /></div>;
}

function QuestScreen({ go, spot, userId, onComplete }: { go: (s: Screen) => void; spot: Destination; userId?: string; onComplete: (spot: Destination) => void | Promise<void> }) {
  const [quest, setQuest] = useState<SpotQuest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    let active = true;
    // oxlint-disable-next-line react/react-compiler
    setLoading(true);
    setLoadError('');
    setQuestionIndex(0);
    setSelected(null);
    setComplete(false);
    loadQuestForSpot(spot.id)
      .then((result) => { if (active) setQuest(result); })
      .catch(() => { if (active) setLoadError('Run the DigosAR app seed in Supabase to load this quiz.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [spot.id]);

  const finishQuest = async () => {
    setComplete(true);
    if (!userId || !quest) {
      setSaveMessage('Sign in to save quiz progress and XP.');
      await onComplete(spot);
      return;
    }
    const completedAt = new Date().toISOString();
    const { error } = await supabase.from('quiz_attempts').insert({
      user_id: userId,
      quest_id: quest.id,
      score: quest.questions.length,
      total_questions: quest.questions.length,
      xp_earned: quest.xpReward,
      completed_at: completedAt,
    });
    // A completed spot also counts toward the Home weekly challenge.
    // Keep this separate from quiz_attempts so scans/visits can contribute too.
    if (!error && spot.id) {
      await supabase.from('user_spot_progress').upsert({
        user_id: userId,
        tourist_spot_id: spot.id,
        status: 'completed',
        visit_count: 1,
        first_visited_at: completedAt,
        last_visited_at: completedAt,
        completed_at: completedAt,
      }, { onConflict: 'user_id,tourist_spot_id' });
    }
    await onComplete(spot);
    setSaveMessage(error ? 'Quiz complete, but progress could not be saved.' : 'Progress saved to your account.');
  };

  if (complete && quest) return <div className="screen quest-screen"><Photo spot={spot} className="quest-complete"><div className="image-shade" /><div className="reward-orbit"><Award size={42} /><i /></div><small>QUEST COMPLETE</small><h1>{quest.title}<br />completed!</h1><div className="reward-total"><strong>+{quest.xpReward} XP</strong><span>{saveMessage || 'Saving your progress…'}</span></div><button onClick={() => go('explore')}>Continue Exploring <ChevronRight size={18} /></button></Photo></div>;
  if (loading) return <div className="screen quest-screen"><div className="quest-cover"><LightHeader title="Quest" showAvatar={false} /></div><section className="quiz-state"><LoadingSkeleton variant="quest" label="Loading your quest…" /></section></div>;
  if (!quest || !quest.questions.length) return <div className="screen quest-screen"><div className="quest-cover"><LightHeader title="Quest" showAvatar={false} /></div><section className="quiz-state"><Info size={30} /><h2>Quiz data is not ready</h2><p>{loadError || 'Add the DigosAR seed data in Supabase, then refresh the app.'}</p><button onClick={() => go('quest')}>Back to Quests</button></section></div>;

  const question = quest.questions[questionIndex];
  const selectedOption = question.options.find((option) => option.id === selected);
  const advance = () => {
    if (!answered) {
      if (!selectedOption?.isCorrect) { setWrong(true); return; }
      setAnswered(true);
      return;
    }
    if (questionIndex === quest.questions.length - 1) { void finishQuest(); return; }
    setQuestionIndex((index) => index + 1);
    setSelected(null);
    setWrong(false);
    setAnswered(false);
  };

  return <div className="screen quest-screen"><div className="quest-cover"><LightHeader title="Quest" showAvatar={false} /><div><span><Gamepad2 size={22} /></span><p><small>{quest.title.toUpperCase()}</small><strong>Question {questionIndex + 1} of {quest.questions.length}</strong></p><b>+{question.xpReward} XP</b></div><Progress value={((questionIndex + 1) / quest.questions.length) * 100} /></div><section className="quiz-card"><small>CHOOSE ONE ANSWER</small><h1>{question.text}</h1><div className="answers">{question.options.map((option, index) => <button key={option.id} className={`${selected === option.id ? 'selected' : ''} ${wrong && selected === option.id ? 'wrong' : ''} ${answered && option.isCorrect ? 'correct' : ''}`} disabled={answered} onClick={() => { setSelected(option.id); setWrong(false); }}><span>{String.fromCharCode(65 + index)}</span><p>{option.text}</p>{selected === option.id && <CheckCircle2 size={19} />}</button>)}</div><button className="submit" disabled={!selected} onClick={advance}>{wrong ? 'Try another answer' : answered ? questionIndex === quest.questions.length - 1 ? 'Finish Quest' : 'Next Question' : 'Check Answer'} <ChevronRight size={18} /></button>{wrong && <p className="wrong-copy">Not quite—choose another answer.</p>}{answered && <p className="answer-explanation">{question.explanation}</p>}<p className="xp-note"><Sparkles size={15} /> {userId ? 'Your completed quiz will be saved.' : 'Sign in to save XP and progress.'}</p></section></div>;
}

function AchievementsScreen({ back, profile, stats, gameData, spots }: { back: () => void; profile: ProfileData | null; stats: DashboardStats | null; gameData: ProfileGameData | null; spots: Destination[] }) {
  const xp = profile?.total_xp ?? 0;
  const level = profile?.level ?? 1;
  const levelXP = xp % 500;
  const earnedBadges = gameData?.badges.filter((badge) => badge.earnedAt) ?? [];
  const availableBadges = gameData?.badges ?? [];
  const nextBadge = availableBadges.find((badge) => !badge.earnedAt);
  const spotCount = stats?.spots_visited ?? 0;
  const badgeCount = earnedBadges.length || stats?.badges_earned || 0;
  return <div className="screen achievements-screen"><LightHeader title="Achievements" back onBack={back} /><section className="xp-panel"><div className="award-halo"><Award size={34} /><span>{badgeCount}</span></div><small>DIGOS EXPLORER</small><h1>{xp.toLocaleString()} <span>Total XP</span></h1><div><p><span>Level {level}</span><b>{levelXP} / 500 XP</b></p><Progress value={(levelXP / 500) * 100} /></div></section><section className="badge-section"><header><div><small>COLLECTION</small><h2>Earned badges</h2></div><span>{badgeCount} of {availableBadges.length || '—'}</span></header><div className="badge-grid">{availableBadges.map((badge, index) => <div className={`badge badge-${index % 4} ${badge.earnedAt ? 'is-earned' : 'is-locked'}`} key={badge.id}><div style={badge.earnedAt && badge.color ? { color: badge.color } : undefined}><BadgeIcon badge={badge} size={25} />{!badge.earnedAt && <LockKeyhole size={12} />}</div><strong>{badge.name}</strong><small>{badge.earnedAt ? badge.description : `Unlock at ${badge.xpRequired} XP`}</small></div>)}</div>{!availableBadges.length && <p className="profile-data-note">Your achievement collection will appear after the Supabase seed data is loaded.</p>}</section><section className="next-reward"><span><Gift size={24} /></span><div><small>NEXT REWARD</small><h3>{nextBadge ? nextBadge.name : 'All current rewards collected'}</h3><Progress value={nextBadge ? Math.min(100, (spotCount / Math.max(1, spots.length)) * 100) : 100} /><p><span>{spotCount} spots visited</span><span>{nextBadge ? nextBadge.description : 'You completed the collection'}</span></p></div></section></div>;
}

function ProfileScreen({ user, profile, stats, gameData, onSignOut, onContinueExploring, refreshProfile, signingOut }: { user: User; profile: ProfileData; stats: DashboardStats | null; gameData: ProfileGameData | null; onSignOut: () => void; onContinueExploring: () => void; refreshProfile: () => Promise<void>; signingOut: boolean }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [draftDisplayName, setDraftDisplayName] = useState(profile.display_name);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsNotice, setSettingsNotice] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState({ current: false, next: false, confirm: false });
  const displayName = profile.display_name || 'Explorer';
  const username = profile.username;
  const xp = profile.total_xp ?? 0;
  const level = profile.level ?? 1;
  const rankLabels = ['Curious Explorer', 'Local Wanderer', 'Digos Adventurer', 'Heritage Hunter', 'Digos Pathfinder', 'Master Explorer'];
  const rank = rankLabels[Math.min(Math.max(level, 1), rankLabels.length) - 1];
  const levelXP = xp % 500;
  const allBadges = gameData?.badges ?? [];
  const badges = allBadges.filter((badge) => badge.slug !== 'highland-scout');
  const earnedBadges = allBadges.filter((badge) => badge.earnedAt);
  const earnedCollectionBadges = badges.filter((badge) => badge.earnedAt);
  const nextBadge = badges.find((badge) => !badge.earnedAt) ?? null;
  const saveProfileSettings = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextDisplayName = draftDisplayName.trim();
    if (!nextDisplayName) { setSettingsError('Enter a display name.'); return; }
    if (nextDisplayName.length > 50) { setSettingsError('Display name must be 50 characters or fewer.'); return; }
    setSettingsSaving(true);
    setSettingsError('');
    setSettingsNotice('');
    const { error: profileError } = await supabase.from('profiles').update({ display_name: nextDisplayName }).eq('id', user.id);
    if (profileError) {
      setSettingsError('Unable to update your profile. Please try again.');
      setSettingsSaving(false);
      return;
    }
    await refreshProfile();
    setSettingsNotice('Display name updated successfully.');
    setSettingsSaving(false);
  };
  const changePassword = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSettingsError('');
    setSettingsNotice('');
    if (!currentPassword) { setSettingsError('Enter your current password.'); return; }
    if (newPassword.length < 6) { setSettingsError('New password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setSettingsError('Passwords do not match.'); return; }
    setPasswordSaving(true);
    const { error: verificationError } = await supabase.auth.signInWithPassword({ email: usernameToAuthEmail(username), password: currentPassword });
    if (verificationError) {
      setSettingsError('Current password is incorrect.');
      setPasswordSaving(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) setSettingsError('Unable to update password. Please try again.');
    else {
      setSettingsNotice('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setPasswordSaving(false);
  };
  const passwordField = (label: string, value: string, setValue: (value: string) => void, key: 'current' | 'next' | 'confirm') => <label><span>{label}</span><div className="profile-password-field"><input required minLength={key === 'current' ? undefined : 6} type={passwordVisible[key] ? 'text' : 'password'} autoComplete={key === 'current' ? 'current-password' : 'new-password'} value={value} onChange={(event) => setValue(event.target.value)} /><button type="button" aria-label={`${passwordVisible[key] ? 'Hide' : 'Show'} ${label.toLowerCase()}`} onClick={() => setPasswordVisible((current) => ({ ...current, [key]: !current[key] }))}>{passwordVisible[key] ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>;
  return <div className="screen profile-screen">
    <div className="profile-top"><header className="light-header profile-header"><span className="header-spacer" aria-hidden="true" /><h1>Profile</h1><button type="button" aria-label="Open profile settings" title="Profile settings" onClick={() => { setDraftDisplayName(displayName); setSettingsError(''); setSettingsNotice(''); setSettingsOpen(true); }}><Settings size={19} /></button></header><ProfileHero displayName={displayName} /></div>
    <section className="profile-body">
      <section className="profile-level-card">
        <div className="profile-level-heading-row"><div className="profile-level-shield" aria-label={`Level ${level} shield`} style={{ backgroundImage: `url('/profile/level-${level === 1 ? 1 : 2}-shield.webp')` }} /><div className="profile-level-title"><strong>{rank}</strong><span>Level {level}</span></div></div>
        <div className="profile-level-progress"><div><strong>{levelXP} / 500 XP</strong><span>{500 - levelXP} XP to Level {level + 1}</span></div><Progress value={(levelXP / 500) * 100} /></div>
        <div className="profile-level-stats"><div><MapPin size={20} /><p><strong>{stats?.spots_visited ?? 0}</strong><span>Places</span></p></div><div><Footprints size={21} /><p><strong>{stats?.quizzes_completed ?? 0}</strong><span>Challenges</span></p></div><div><Medal size={22} /><p><strong>{earnedBadges.length || stats?.badges_earned || 0}</strong><span>Badge</span></p></div></div>
      </section>
      <section className="profile-section profile-achievements-preview"><header><h2>Explorer Collection</h2><span className="profile-collection-count">{earnedCollectionBadges.length} / {badges.length || 8} earned <ChevronRight size={15} /></span></header><div className="profile-badge-scene"><div className="profile-horizontal-rail profile-badges-carousel">{badges.map((badge) => <article className={`profile-badge ${badge.earnedAt ? 'is-earned' : 'is-locked'}`} key={badge.id}><div className="profile-badge-medallion">{profileBadgeArtwork[badge.slug] ? <div className="profile-badge-artwork" aria-hidden="true" style={{ backgroundImage: `url('${profileBadgeArtwork[badge.slug]}')` }} /> : <span><BadgeIcon badge={badge} size={37} /></span>}</div><strong>{badge.name}</strong><p className="profile-badge-description">{badge.description || 'Explore Digos to earn this badge.'}</p><small className={`profile-badge-state ${badge.earnedAt ? 'is-earned' : 'is-locked'}`}>{badge.earnedAt ? <><CheckCircle2 size={11} />Earned</> : <><LockKeyhole size={10} />Locked</>}</small></article>)}</div></div></section>
      <section className="profile-next-discovery"><div className="profile-next-discovery-copy"><small>YOUR NEXT DISCOVERY</small><strong>{nextBadge ? `Continue toward ${nextBadge.name}` : 'Collection complete'}</strong><span>{nextBadge?.description || 'Explore more Digos landmarks to keep collecting.'}</span></div><button type="button" onClick={onContinueExploring}>Continue exploring <ArrowRight size={16} /></button></section>
      <nav className="profile-menu profile-account-menu" aria-label="Account options"><button><span><Info size={19} /></span><strong>About DigosAR</strong><ChevronRight size={18} /></button><button className="sign-out-item" onClick={() => setSignOutOpen(true)}><span><LogOut size={19} /></span><strong>Sign out</strong><ChevronRight size={18} /></button></nav>
    </section>
    {settingsOpen && <div className="profile-settings-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}><dialog open className="profile-settings-dialog" aria-labelledby="profile-settings-title"><header><div><small>ACCOUNT</small><h2 id="profile-settings-title">Profile settings</h2></div><button type="button" onClick={() => setSettingsOpen(false)} aria-label="Close profile settings">×</button></header><form onSubmit={saveProfileSettings}><label><span>Display name</span><input required maxLength={50} value={draftDisplayName} onChange={(event) => setDraftDisplayName(event.target.value)} /></label><label><span>Username</span><input value={`@${username}`} readOnly aria-describedby="username-readonly-note" /></label><p id="username-readonly-note">Username changes are not available yet.</p><button className="profile-settings-save" disabled={settingsSaving || passwordSaving}>{settingsSaving ? 'Saving…' : 'Save display name'}</button></form><div className="profile-settings-divider" /><form onSubmit={changePassword}><div className="profile-settings-section-title"><small>SECURITY</small><strong>Change password</strong></div>{passwordField('Current password', currentPassword, setCurrentPassword, 'current')}{passwordField('New password', newPassword, setNewPassword, 'next')}{passwordField('Confirm new password', confirmPassword, setConfirmPassword, 'confirm')}{settingsError && <p className="auth-error">{settingsError}</p>}{settingsNotice && <p className="auth-notice">{settingsNotice}</p>}<button className="profile-settings-save" disabled={passwordSaving || settingsSaving}>{passwordSaving ? 'Updating…' : 'Change password'}</button></form></dialog></div>}
    {signOutOpen && <div className="signout-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !signingOut) setSignOutOpen(false); }}><dialog open className="signout-confirm-dialog" aria-labelledby="signout-confirm-title"><h2 id="signout-confirm-title">Sign out?</h2><p>Are you sure you want to sign out of DigosAR?</p><div><button type="button" disabled={signingOut} onClick={() => setSignOutOpen(false)}>Cancel</button><button type="button" className="confirm" disabled={signingOut} onClick={onSignOut}>{signingOut ? 'Signing out…' : 'Sign out'}</button></div></dialog></div>}
  </div>;
}

function BottomNav({ active, go }: { active: Screen; go: (s: Screen) => void }) {
  return <nav className={`bottom-nav ${active === 'home' ? 'home-glass-nav' : ''}`} aria-label="Main navigation">{nav.map(({ screen, label, icon: Icon }) => <button key={screen} aria-label={label} className={`${screen === 'ar' ? 'ar-nav' : ''} ${active === screen ? 'active' : ''}`} onClick={() => go(screen)}>{screen === 'ar' ? <span className="ar-nav-mark"><Scan className="ar-nav-scan" size={35} strokeWidth={1.8} /><Cube className="ar-nav-cube" size={19} strokeWidth={1.8} /></span> : <><span><Icon size={20} /></span><small>{label}</small></>}</button>)}</nav>;
}

export default function DigosAR() {
  const [screen, setScreen] = useState<Screen>('explore');
  const [spots, setSpots] = useState<Destination[]>(destinations);
  const [spot, setSpot] = useState(destinations[0]);
  const [previous, setPrevious] = useState<Screen>('home');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [gameData, setGameData] = useState<ProfileGameData | null>(null);
  const [challengeProgress, setChallengeProgress] = useState(0);
  const [spotsLoading, setSpotsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [authToast, setAuthToast] = useState('');
  const [bootStage, setBootStage] = useState('app shell');
  const [bootTimedOut, setBootTimedOut] = useState(false);
  const bootTimeoutRef = useRef<number | null>(null);
  const authRedirectTimerRef = useRef<number | null>(null);
  const [unlockedQuestSlugs, setUnlockedQuestSlugs] = useState<string[]>([]);
  const [dawisQuestUnlocked, setDawisQuestUnlocked] = useState(false);
  const dawisQuestUnlockedRef = useRef(false);
  const [resumeQuestOnReturn, setResumeQuestOnReturn] = useState(false);
  const [questUnlockToast, setQuestUnlockToast] = useState('');
  const questUnlockToastTimerRef = useRef<number | null>(null);
  const [achievementToast, setAchievementToast] = useState<AchievementToast | null>(null);
  const achievementToastTimerRef = useRef<number | null>(null);
  const knownEarnedBadgeIdsRef = useRef<Set<string>>(new Set());
  const achievementToastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const achievementToastSwipedRef = useRef(false);
  const markBoot = useCallback((stage: string) => {
    if (!import.meta.env.DEV) return;
    console.info(`[DigosAR Boot] ${stage}`);
    setBootStage(stage);
  }, []);
  useEffect(() => {
    markBoot('root mounted');
    bootTimeoutRef.current = window.setTimeout(() => {
      console.error('[DigosAR Boot ERROR] Startup exceeded 8 seconds.');
      setBootTimedOut(true);
    }, 8000);
    return () => { if (bootTimeoutRef.current !== null) window.clearTimeout(bootTimeoutRef.current); };
  }, [markBoot]);
  useEffect(() => {
    if (spotsLoading || authLoading || profileLoading || accountLoading) return;
    if (bootTimeoutRef.current !== null) window.clearTimeout(bootTimeoutRef.current);
    setBootTimedOut(false);
    markBoot('UI rendered');
  }, [spotsLoading, authLoading, profileLoading, accountLoading, markBoot]);
  const refreshProfile = useCallback(async (showLoading = true) => {
    if (!user) { setProfile(null); setProfileLoading(false); return; }
    if (showLoading) setProfileLoading(true);
    const { data, error } = await supabase.from('profiles').select('display_name, username, total_xp, level').eq('id', user.id).single();
    if (!error && data) setProfile(data as ProfileData);
    else setProfile(null);
    if (showLoading) setProfileLoading(false);
  }, [user]);
  const refreshGameData = useCallback(async () => {
    if (!user) { setGameData(null); knownEarnedBadgeIdsRef.current = new Set(); return null; }
    try {
      const next = await loadProfileGameData(user.id);
      knownEarnedBadgeIdsRef.current = new Set(next.badges.filter((badge) => badge.earnedAt).map((badge) => badge.id));
      setGameData(next);
      return next;
    } catch (error) { console.error('[DigosAR Progress] Unable to load achievements', error); setGameData(null); return null; }
  }, [user]);
  const refreshDashboardStats = useCallback(async () => {
    if (!user) { setStats(null); return; }
    const { data, error } = await supabase.from('user_dashboard_stats').select('spots_visited, quizzes_completed, badges_earned').eq('user_id', user.id).maybeSingle();
    if (!error && data) setStats(data as DashboardStats);
  }, [user]);
  const refreshChallengeProgress = useCallback(async () => {
    if (!user) { setChallengeProgress(0); return; }
    try { setChallengeProgress(Math.min(await loadWeeklyHeritageProgress(user.id), weeklyChallenge.target)); }
    catch { setChallengeProgress(0); }
  }, [user]);
  const notifyNewAchievements = useCallback((next: ProfileGameData | null, previouslyEarned: Set<string>) => {
    if (!next) return;
    const newlyEarned = next.badges.filter((badge) => badge.earnedAt && !previouslyEarned.has(badge.id));
    if (!newlyEarned.length) return;
    if (achievementToastTimerRef.current !== null) window.clearTimeout(achievementToastTimerRef.current);
    setAchievementToast({ badgeNames: newlyEarned.map((badge) => badge.name) });
    achievementToastTimerRef.current = window.setTimeout(() => {
      setAchievementToast(null);
      achievementToastTimerRef.current = null;
    }, 3000);
  }, []);
  const dismissAchievementToast = useCallback(() => {
    if (achievementToastTimerRef.current !== null) window.clearTimeout(achievementToastTimerRef.current);
    achievementToastTimerRef.current = null;
    setAchievementToast(null);
  }, []);
  const transitionTo = (next: Screen) => {
    setTransitionLoading(true);
    window.setTimeout(() => {
      setPrevious(screen);
      setScreen(next);
      document.querySelector('.app-content')?.scrollTo({ top: 0, behavior: 'smooth' });
      setTransitionLoading(false);
    }, 650);
  };
  const go = (next: Screen) => {
    if (protectedScreens.has(next) && !user) {
      if (authRedirectTimerRef.current !== null) return;
      setAuthToast('You need to log in first.');
      authRedirectTimerRef.current = window.setTimeout(() => {
        setTransitionLoading(true);
        window.location.assign(`/login?next=${next}`);
      }, 850);
      return;
    }
    transitionTo(next);
  };
  useEffect(() => () => {
    if (authRedirectTimerRef.current !== null) window.clearTimeout(authRedirectTimerRef.current);
    if (questUnlockToastTimerRef.current !== null) window.clearTimeout(questUnlockToastTimerRef.current);
    if (achievementToastTimerRef.current !== null) window.clearTimeout(achievementToastTimerRef.current);
  }, []);

  useEffect(() => {
    if (!user || !['profile', 'achievements'].includes(screen)) return;
    void Promise.all([refreshProfile(), refreshGameData(), refreshDashboardStats()]);
  }, [screen, user, refreshDashboardStats, refreshGameData, refreshProfile]);
  useEffect(() => {
    // Challenge progress is refreshed as the user returns to Home/Profile.
    // oxlint-disable-next-line react/react-compiler
    if (user) void refreshChallengeProgress();
    else setChallengeProgress(0);
  }, [screen, user, refreshChallengeProgress]);
  const open = (d: Destination) => { setSpot(d); transitionTo('details') };
  const handleQuestComplete = useCallback(async () => {
    if (!user) return;
    const previouslyEarned = new Set(knownEarnedBadgeIdsRef.current);
    // The quiz insert runs server-side XP and badge triggers. Refresh only
    // after that insert resolves so Profile/Home show the awarded state.
    const [freshGameData] = await Promise.all([
      refreshGameData(),
      refreshProfile(false),
      refreshDashboardStats(),
      refreshChallengeProgress(),
    ]);
    notifyNewAchievements(freshGameData, previouslyEarned);
  }, [notifyNewAchievements, refreshChallengeProgress, refreshDashboardStats, refreshGameData, refreshProfile, user]);
  const recordTargetScan = useCallback((targetId: string) => {
    const locationTargets = new Set(['dawis', 'old-dawis', 'terminal-platform', 'mooring-bollards', 'support-piles', 'shoreline-rocks']);
    if (!locationTargets.has(targetId)) return;
    const discoveryIds = new Set(['terminal-platform', 'mooring-bollards', 'support-piles', 'shoreline-rocks']);
    if (discoveryIds.has(targetId) && !dawisQuestUnlockedRef.current) {
      setQuestUnlockToast('Scan the main Dawis marker first to unlock the four targets.');
      if (questUnlockToastTimerRef.current !== null) window.clearTimeout(questUnlockToastTimerRef.current);
      questUnlockToastTimerRef.current = window.setTimeout(() => setQuestUnlockToast(''), 4200);
      return;
    }
    const locationSlug = 'dawis-heritage-wharf';
    const scannedSpot = spots.find((item) => item.slug === locationSlug);
    const isDawisEntryTarget = targetId === 'dawis';
    if (isDawisEntryTarget) {
      dawisQuestUnlockedRef.current = true;
      setDawisQuestUnlocked(true);
      setUnlockedQuestSlugs((current) => Array.from(new Set([...current, locationSlug])));
      setQuestUnlockToast('Dawis quest unlocked. Your waterfront route is ready.');
      if (questUnlockToastTimerRef.current !== null) window.clearTimeout(questUnlockToastTimerRef.current);
      questUnlockToastTimerRef.current = window.setTimeout(() => setQuestUnlockToast(''), 4200);
    }
    if (!user || !scannedSpot?.id) return;
    const scannedSpotId = scannedSpot.id;
    const visitedAt = new Date().toISOString();
    const previouslyEarned = new Set(knownEarnedBadgeIdsRef.current);
    void (async () => {
      const [progressSave, scanSave] = await Promise.all([
        supabase.from('user_spot_progress').upsert({
          user_id: user.id,
          tourist_spot_id: scannedSpotId,
          status: 'visited',
          visit_count: 1,
          first_visited_at: visitedAt,
          last_visited_at: visitedAt,
        }, { onConflict: 'user_id,tourist_spot_id' }),
        supabase.from('ar_scan_history').insert({
          user_id: user.id,
          tourist_spot_id: scannedSpotId,
          recognized: true,
          target_id: targetId,
        }),
      ]);
      if (progressSave.error) console.error('[DigosAR Progress] Visit save failed', progressSave.error);
      if (scanSave.error) console.error('[DigosAR Progress] AR scan save failed', scanSave.error);
      if (discoveryIds.has(targetId)) {
        try {
          const quest = await loadDawisQuestProgress(user.id, scannedSpotId);
          if (quest) await recordDawisQuestDiscovery(user.id, quest.questId, targetId);
        } catch (error) {
          console.error('[DigosAR Quest] Discovery save failed', error);
        }
      }
      const [freshGameData] = await Promise.all([
        refreshGameData(),
        refreshProfile(false),
        refreshDashboardStats(),
        refreshChallengeProgress(),
      ]);
      notifyNewAchievements(freshGameData, previouslyEarned);
    })().catch((error) => console.error('[DigosAR Progress] Scan progress refresh failed', error));
  }, [notifyNewAchievements, refreshChallengeProgress, refreshDashboardStats, refreshGameData, refreshProfile, spots, user]);
  const openAR = (d: Destination) => {
    if (user && d.id && d.slug !== 'dawis-heritage-wharf') {
      const visitedAt = new Date().toISOString();
      void supabase.from('user_spot_progress').upsert({
        user_id: user.id,
        tourist_spot_id: d.id,
        status: 'visited',
        visit_count: 1,
        first_visited_at: visitedAt,
        last_visited_at: visitedAt,
      }, { onConflict: 'user_id,tourist_spot_id' });
    }
    setSpot(d);
    transitionTo('ar');
  };
  useEffect(() => {
    let active = true;
    if (!user || !spots.length) {
      // oxlint-disable-next-line react/react-compiler
      setUnlockedQuestSlugs([]);
      setDawisQuestUnlocked(false);
      dawisQuestUnlockedRef.current = false;
      return () => { active = false; };
    }
    const loadUnlockedMarkers = async () => {
      const [{ data: progressData, error: progressError }, { data: scanData, error: scanError }] = await Promise.all([
        supabase.from('user_spot_progress').select('tourist_spot_id').eq('user_id', user.id).in('status', ['visited', 'completed']),
        supabase.from('ar_scan_history').select('tourist_spot_id, target_id').eq('user_id', user.id).eq('recognized', true),
      ]);
      if (!active) return;
      if (progressError) {
        console.error('[DigosAR Progress] Unable to load unlocked destinations', progressError);
        return;
      }
      if (scanError) {
        console.error('[DigosAR Progress] Unable to load Dawis marker unlock', scanError);
        setDawisQuestUnlocked(false);
      }
      const visitedIds = new Set((progressData ?? []).map((row) => row.tourist_spot_id));
      const dawisSpot = spots.find((item) => item.slug === 'dawis-heritage-wharf');
      const entryScanned = !scanError && (scanData ?? []).some((row) => row.tourist_spot_id === dawisSpot?.id && row.target_id === 'dawis');
      // Keep an optimistic unlock from the current scan if the history insert
      // is still in flight when the Quest screen starts loading.
      dawisQuestUnlockedRef.current = dawisQuestUnlockedRef.current || entryScanned;
      setDawisQuestUnlocked((current) => current || entryScanned);
      setUnlockedQuestSlugs([
        ...spots.filter((item) => item.slug !== dawisSpot?.slug && item.id && visitedIds.has(item.id)).map((item) => item.slug),
        ...(entryScanned && dawisSpot ? [dawisSpot.slug] : []),
      ]);
    };
    void loadUnlockedMarkers();
    return () => { active = false; };
  }, [screen, spots, user]);

  useEffect(() => {
    let active = true;
    markBoot('tourist spots fetch started');
    loadTouristSpots().then((loaded) => {
      if (!active) return;
      setSpots(loaded);
      setSpot((current) => loaded.find((item) => item.slug === current.slug) ?? loaded[0]);
    }).catch((error) => { console.error('[DigosAR Boot ERROR] Tourist spots fetch failed', error); }).finally(() => { if (active) { setSpotsLoading(false); markBoot('tourist spots fetch finished'); } });
    return () => { active = false; };
  }, [markBoot]);

  useEffect(() => {
    let active = true;
    markBoot('getSession started');
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      const requestedView = new URLSearchParams(window.location.search).get('view') as Screen | null;
      const requested = requestedView && linkableScreens.has(requestedView) ? requestedView : null;
      if (currentUser) {
        setScreen(requested ?? 'home');
      } else if (requested && !protectedScreens.has(requested)) {
        setScreen(requested);
      } else {
        window.location.replace(`/login?next=${requested ?? 'home'}`);
      }
    }).catch((error) => { console.error('[DigosAR Boot ERROR] getSession failed', error); }).finally(() => { if (active) { setAuthLoading(false); markBoot('getSession finished'); } });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) { setProfile(null); setProfileLoading(false); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [markBoot]);

  useEffect(() => {
    // Account state is synchronized from Supabase, the external source of truth.
    // oxlint-disable-next-line react/react-compiler
    if (!user) { setProfile(null); setStats(null); setGameData(null); setProfileLoading(false); setAccountLoading(false); return; }
    let active = true;
    // oxlint-disable-next-line react/react-compiler
    setAccountLoading(true);
    markBoot('profile fetch started');
    void Promise.all([refreshProfile(), refreshGameData(), refreshDashboardStats()]).then(() => {
      if (!active) return;
    }).catch((error) => { console.error('[DigosAR Boot ERROR] Account fetch failed', error); }).finally(() => { if (active) { setAccountLoading(false); markBoot('profile fetch finished'); } });
    return () => { active = false; };
  }, [user, refreshDashboardStats, refreshGameData, refreshProfile, markBoot]);

  const signOut = async () => {
    setActionLoading(true);
    try {
      await supabase.auth.signOut({ scope: 'local' });
      setUser(null);
      setProfile(null);
      setStats(null);
      setGameData(null);
      setChallengeProgress(0);
      setScreen('explore');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController(); const allowed: Screen[] = ['home','explore','ar','quest','achievements','profile'];
    void Promise.resolve(context.registerTool({ name: 'open_digosar_screen', title: 'Open a DigosAR screen', description: 'Navigate to a main DigosAR prototype screen.', inputSchema: { type: 'object', properties: { screen: { type: 'string', enum: allowed } }, required: ['screen'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input: unknown) { const requested = (input as { screen?: Screen })?.screen; if (!requested || !allowed.includes(requested)) throw new Error('Unknown DigosAR screen.'); setScreen(requested); return { screen: requested, status: 'opened' } } }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);
  const active: Screen = screen === 'details' || screen === 'navigation' || screen === 'model' ? 'explore' : screen === 'quiz' ? 'quest' : screen === 'achievements' ? 'profile' : screen;
  let content: React.ReactNode;
  if (screen === 'home') content = <HomeScreen go={go} open={open} spots={spots} displayName={profileLoading ? '' : profile?.display_name || 'Explorer'} challengeProgress={challengeProgress} />;
  else if (screen === 'explore') content = <ExploreScreen open={open} spots={spots} />;
  else if (screen === 'details') content = <DetailsScreen spot={spot} go={go} />;
  else if (screen === 'ar') content = <ARCameraScreen onBack={() => go(previous === 'ar' ? 'home' : previous)} onTargetScanned={recordTargetScan} onOpenQuest={() => go('quest')} />;
  else if (screen === 'navigation') content = <NavigationScreen spot={spot} go={go} />;
  else if (screen === 'model') content = <ModelScreen spot={spot} go={go} />;
  else if (screen === 'quest') content = <QuestExplorer spots={spots} unlockedSlugs={unlockedQuestSlugs} questUnlocked={dawisQuestUnlocked} userId={user?.id} scanSpot={(selectedSpot) => { setResumeQuestOnReturn(true); openAR(selectedSpot); }} onComplete={handleQuestComplete} openQuiz={(selectedSpot) => { setSpot(selectedSpot); go('quiz'); }} resumeQuest={resumeQuestOnReturn} onResumeQuestConsumed={() => setResumeQuestOnReturn(false)} />;
  else if (screen === 'quiz') content = <QuestScreen go={go} spot={spot} userId={user?.id} onComplete={handleQuestComplete} />;
  else if (screen === 'achievements') content = <AchievementsScreen back={() => go('profile')} profile={profile} stats={stats} gameData={gameData} spots={spots} />;
  else if (!user) content = <HomeScreen go={go} open={open} spots={spots} displayName="Explorer" challengeProgress={0} />;
  else if (!profile) content = <div className="screen profile-screen" />;
  else content = <ProfileScreen user={user} profile={profile} stats={stats} gameData={gameData} onSignOut={() => void signOut()} onContinueExploring={() => go('explore')} refreshProfile={refreshProfile} signingOut={actionLoading} />;
  const isGloballyLoading = screen !== 'ar' && !bootTimedOut && (spotsLoading || authLoading || profileLoading || transitionLoading || accountLoading || actionLoading);
  const loadingLabel = transitionLoading ? 'Opening…' : accountLoading ? 'Loading your account…' : actionLoading ? 'Please wait…' : 'Preparing your DigosAR experience…';
  const usesDarkShell = ['home', 'explore', 'quest', 'quiz', 'achievements', 'profile'].includes(screen);
  return <main className="site-shell">
    <div className="desktop-brand"><Logo inverse /><h1>A new layer<br />of Digos.</h1><p>Immersive tourism. Local stories.<br />One AR-ready companion.</p><span>WEB APP EXPERIENCE</span></div>
    <div className={`phone ${screen === 'home' ? 'home-phone' : ''} ${screen === 'ar' ? 'ar-phone' : ''} ${usesDarkShell ? 'dark-phone' : ''} ${isGloballyLoading ? 'is-loading' : ''}`}>
      {screen !== 'ar' && <div className={`status-bar ${['home','navigation'].includes(screen) ? 'light' : ''}`}><span>9:41</span><div><i /><i /><b /></div></div>}
      <div className="app-content">{content}</div>
      {screen !== 'ar' && screen !== 'details' && <BottomNav active={active} go={go} />}
      {authToast && <output className="auth-required-toast">{authToast}</output>}
      {achievementToast && <button
        type="button"
        key={achievementToast.badgeNames.join('|')}
        className="achievement-unlock-toast"
        aria-live="polite"
        aria-label={`Achievement unlocked: ${achievementToast.badgeNames.join(', ')}. Open your profile.`}
        onPointerDown={(event) => {
          achievementToastPointerRef.current = { x: event.clientX, y: event.clientY };
          achievementToastSwipedRef.current = false;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={(event) => {
          const start = achievementToastPointerRef.current;
          achievementToastPointerRef.current = null;
          if (start && (Math.abs(event.clientX - start.x) > 30 || Math.abs(event.clientY - start.y) > 30)) {
            achievementToastSwipedRef.current = true;
            dismissAchievementToast();
          }
        }}
        onPointerCancel={() => { achievementToastPointerRef.current = null; }}
        onClick={() => {
          if (achievementToastSwipedRef.current) { achievementToastSwipedRef.current = false; return; }
          dismissAchievementToast();
          go('profile');
        }}
      >
        <span className="achievement-unlock-icon"><Award size={19} /></span>
        <span className="achievement-unlock-copy"><strong>{achievementToast.badgeNames.length === 1 ? 'Achievement unlocked' : `${achievementToast.badgeNames.length} achievements unlocked`}</strong><small>{achievementToast.badgeNames.join(' · ')} · Tap to view Profile</small></span>
        <ChevronRight size={17} aria-hidden="true" />
      </button>}
      {questUnlockToast && !achievementToast && <output className="auth-required-toast quest-unlock-toast">{questUnlockToast}</output>}
      {isGloballyLoading && <div className="global-loading"><LoadingSkeleton variant="app" label={loadingLabel} /></div>}
      {import.meta.env.DEV && <output className="boot-debug-overlay">BOOT: {bootStage}{bootTimedOut ? ' · timeout' : ''}</output>}
      {bootTimedOut && <div className="boot-timeout"><strong>DigosAR is taking longer than expected to load.</strong><button type="button" onClick={() => window.location.reload()}>Retry</button></div>}
    </div>
    <div className="desktop-index"><span>01</span><i /><span>FOREST GLASS</span></div>
  </main>;
}
