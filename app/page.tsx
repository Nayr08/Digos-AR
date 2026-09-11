'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Award, Box as Cube, Camera, CheckCircle2, ChevronRight, Church,
  Clock3, Compass, Expand, Filter, Flashlight, Footprints, Gamepad2, Gift, Heart,
  History, Home, Image, Info, Landmark, Leaf, LockKeyhole, LogOut, Map, MapPin, Medal,
  Navigation, PlayCircle, Route, Scan, Search, Settings, Sparkles, Star, Trophy, UserRound,
  Volume2,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import {
  fallbackDestinations, loadQuestForSpot, loadTouristSpots,
  type Destination, type SpotQuest,
} from '@/lib/digosar-data';
import { ARLoader } from '@/components/ar-loader';

type Screen = 'home' | 'explore' | 'details' | 'ar' | 'quest' | 'quiz' | 'achievements' | 'profile' | 'navigation' | 'model';
type ProfileData = { display_name: string; total_xp: number; level: number };
type DashboardStats = { spots_visited: number; quizzes_completed: number; badges_earned: number };
type RecentTrail = { slug: string; status: 'resume' | 'completed'; updatedAt: number };

const destinations = fallbackDestinations;

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

function SpotCategoryIcon({ type, size = 20 }: { type: string; size?: number }) {
  const normalized = type.toLowerCase();
  const Icon = normalized === 'nature' ? Leaf : normalized === 'heritage' ? Landmark : normalized === 'culture' ? Church : History;
  return <Icon size={size} aria-hidden="true" />;
}

function HomeScreen({ go, open, openAR, spots, recentTrail }: { go: (s: Screen) => void; open: (d: Destination) => void; openAR: (d: Destination) => void; spots: Destination[]; recentTrail: RecentTrail | null }) {
  const [query, setQuery] = useState('');
  const recentSpot = recentTrail ? spots.find((item) => item.slug === recentTrail.slug) ?? null : null;
  return <div className="screen home-screen">
    <div className="home-backdrop">
      <div className="image-shade" />
      <div className="home-copy"><p>Explore Digos City</p><h1>Discover Digos<br /><em>Through AR</em></h1></div>
      <label className="glass-search"><Search size={19} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tourist spots..." /><button onClick={() => go('explore')} aria-label="Search"><ChevronRight size={18} /></button></label>
      <section className={`home-recent-trail ${recentTrail?.status === 'completed' ? 'completed' : ''}`}><small>CONTINUE YOUR TRAIL</small>{recentSpot ? <div><span><Route size={18} /></span><p><strong>{recentSpot.name}</strong><small>{recentSpot.distance} away · latest AR trail</small></p><button onClick={() => recentTrail?.status === 'completed' ? open(recentSpot) : openAR(recentSpot)}>{recentTrail?.status === 'completed' ? <><CheckCircle2 size={14} /> Completed</> : 'Resume'}</button></div> : <div><span><Route size={18} /></span><p><strong>No recent AR trail</strong><small>Open a destination in AR to start one.</small></p><button onClick={() => go('explore')}>Explore</button></div>}</section>
      <div className="popular-head"><div><small>CURATED FOR YOU</small><h2>Popular Tourist Spots</h2></div><button onClick={() => go('explore')}>View all</button></div>
      <div className="popular-rail">{spots.map((spot) => <button className="popular-card" aria-label={`Open ${spot.name}`} key={spot.slug} onClick={() => open(spot)}>
        <Photo spot={spot}><span className={`card-category-icon category-${spot.type.toLowerCase()}`} aria-label={spot.type}><SpotCategoryIcon type={spot.type} /></span><div className="card-glass"><div><small>{spot.type}</small><h3>{spot.name}</h3><p><Footprints size={12} /> {spot.distance}</p></div><strong>+{spot.xpReward} XP</strong></div></Photo>
      </button>)}</div>
    </div>
  </div>;
}

function ExploreScreen({ open, spots }: { open: (d: Destination) => void; spots: Destination[] }) {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const visible = useMemo(() => spots.filter(d => (category === 'All' || d.type === category) && d.name.toLowerCase().includes(query.toLowerCase())), [spots, category, query]);
  return <div className="screen explore-screen"><div className="dark-cap"><LightHeader title="Explore Digos" showAvatar={false} /><p>Every place holds a story.</p><div className="explore-search"><Search size={19} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tourist spots..." /><Filter size={18} /></div><div className="explore-chips">{['All', 'Nature', 'Heritage', 'Culture', 'History'].map(c => <button className={category === c ? 'active' : ''} onClick={() => setCategory(c)} key={c}>{c}</button>)}</div></div>
    <section className="visual-list"><div className="list-heading"><span>{visible.length} places</span><small>Interactive city guides</small></div>{visible.map(spot => <button className="visual-card" aria-label={`Open ${spot.name}`} key={spot.slug} onClick={() => open(spot)}><Photo spot={spot}><div className="image-shade" /><div className="visual-top"><span><Star size={12} fill="currentColor" /> {spot.rating}</span><i><ChevronRight size={19} /></i></div><div className="visual-copy"><small>{spot.type}</small><h2>{spot.name}</h2><p>{spot.description}</p><div><span><MapPin size={12} /> {spot.distance}</span><strong>+{spot.xpReward} XP</strong></div></div></Photo></button>)}{!visible.length && <div className="empty"><Search size={28} /><h2>No places found</h2><p>Try another name or category.</p></div>}</section>
  </div>;
}

function DetailsScreen({ spot, go, userId }: { spot: Destination; go: (s: Screen) => void; userId?: string }) {
  const [favorite, setFavorite] = useState(false);
  useEffect(() => {
    // oxlint-disable-next-line react/react-compiler
    if (!userId || !spot.id) { setFavorite(false); return; }
    let active = true;
    void supabase.from('favorites').select('tourist_spot_id').eq('user_id', userId).eq('tourist_spot_id', spot.id).maybeSingle().then(({ data }) => { if (active) setFavorite(Boolean(data)); });
    return () => { active = false; };
  }, [userId, spot.id]);
  const toggleFavorite = async () => {
    if (!userId) { go('profile'); return; }
    if (!spot.id) return;
    const next = !favorite;
    setFavorite(next);
    const { error } = next
      ? await supabase.from('favorites').insert({ user_id: userId, tourist_spot_id: spot.id })
      : await supabase.from('favorites').delete().eq('user_id', userId).eq('tourist_spot_id', spot.id);
    if (error) setFavorite(!next);
  };
  return <div className="screen detail-screen"><Photo spot={spot} className="detail-hero"><div className="image-shade" /><div className="detail-top"><GlassIcon label="Back" onClick={() => go('explore')}><ArrowLeft size={20} /></GlassIcon><div><GlassIcon label="Expand image"><Expand size={18} /></GlassIcon><GlassIcon label={favorite ? 'Remove favorite' : 'Save favorite'} active={favorite} onClick={() => void toggleFavorite()}><Heart size={18} fill={favorite ? 'currentColor' : 'none'} /></GlassIcon></div></div><div className="detail-image-title"><small>{spot.type} · {spot.distance}</small><h1>{spot.name}</h1></div></Photo>
    <article className="info-sheet"><span className="sheet-handle" aria-hidden="true" /><div className="spot-meta"><p><MapPin size={13} /> {spot.location}</p><span>+100 XP</span></div><h1>{spot.name}</h1><div className="fact-row"><div><Leaf size={17} /><span><small>Category</small><strong>{spot.type}</strong></span></div><div><Clock3 size={17} /><span><small>Best time</small><strong>{spot.best}</strong></span></div><div><Footprints size={17} /><span><small>Distance</small><strong>{spot.distance}</strong></span></div></div>
      <section className="story"><small>ABOUT</small><h2>A place worth knowing</h2><div className="floating-actions"><button onClick={() => go('quest')}><Gamepad2 size={18} /> Quest</button><button onClick={() => go('navigation')}><Navigation size={18} fill="currentColor" /> Go</button></div><p>{spot.description}</p></section>
      <section className="story-columns"><div><History size={19} /><h3>History</h3><p>{spot.history}</p></div><div><Medal size={19} /><h3>Cultural significance</h3><p>{spot.culture}</p></div></section>
      <div className="media-preview"><Photo spot={spot}><PlayCircle size={34} /><span><small>MULTIMEDIA PREVIEW</small><strong>Watch the local story</strong></span></Photo><button onClick={() => go('model')}><Cube size={18} /> View 3D Model</button></div>
    </article>
  </div>;
}

function ARScreen({ spot, go, back, onRecognized }: { spot: Destination; go: (s: Screen) => void; back: () => void; onRecognized: (spot: Destination) => void }) {
  const [recognized, setRecognized] = useState(false);
  const recognize = () => { setRecognized(true); onRecognized(spot); };
  return <div className="screen ar-screen"><Photo spot={spot} className="ar-camera"><div className="ar-shade" /><div className="ar-top"><GlassIcon label="Back" onClick={back}><ArrowLeft size={20} /></GlassIcon><div><small>AR PREVIEW</small><h1>{recognized ? 'Spot recognized' : 'Scanning...'}</h1></div><GlassIcon label="Flash"><Flashlight size={19} /></GlassIcon></div>
    <div className="scan-sweep" /><button className="recognition-point point-one" onClick={recognize} aria-label="Scan this marker"><i /></button><span className="recognition-point point-two"><i /></span><span className="recognition-point point-three"><i /></span>
    {recognized && <div className="recognition-card"><Photo spot={spot} /><div><small><CheckCircle2 size={12} /> TOURIST SPOT RECOGNIZED</small><h2>{spot.name}</h2><p>{spot.location} · {spot.type}</p><button onClick={() => go('details')}>Explore <ChevronRight size={15} /></button></div></div>}
    <div className="ground-path"><i>↑</i><i>↑</i><i>↑</i></div><div className="ar-nav-card"><Photo spot={spot} /><div><small>NEXT DESTINATION</small><strong>{spot.name}</strong><span><MapPin size={12} /> 120 m</span></div><button onClick={() => go('navigation')}><Navigation size={18} /></button></div>
  </Photo></div>;
}

function NavigationScreen({ spot, go }: { spot: Destination; go: (s: Screen) => void }) {
  return <div className="screen nav-preview"><Photo spot={spot} className="nav-photo"><div className="ar-shade" /><div className="ar-top"><GlassIcon label="Back" onClick={() => go('details')}><ArrowLeft size={20} /></GlassIcon><div><small>AR NAVIGATION</small><h1>Follow the trail</h1></div><GlassIcon label="Map"><Map size={19} /></GlassIcon></div><div className="nav-distance"><Navigation size={27} fill="currentColor" /><small>Continue straight</small><strong>120 m</strong><span>to {spot.name}</span></div><div className="route-arrows"><b>↑</b><b>↑</b><b>↑</b><b>↑</b></div><div className="ar-nav-card large"><Photo spot={spot} /><div><small>DESTINATION</small><strong>{spot.name}</strong><span><Clock3 size={12} /> 3 min · {spot.distance}</span></div><button onClick={() => go('ar')}>AR</button></div></Photo></div>;
}

function ModelScreen({ spot, go }: { spot: Destination; go: (s: Screen) => void }) {
  return <div className="screen model-screen"><LightHeader title="3D Preview" back onBack={() => go('details')} /><div className="model-stage"><div className="model-grid" /><div className="model-cube"><Cube size={74} /><span /></div><small>PLACEHOLDER MODEL</small><h1>{spot.name}</h1><p>Drag and rotate controls will appear here when the interactive 3D experience is connected.</p></div><div className="model-tools"><button><Volume2 size={19} /> Audio guide</button><button><Image size={19} /> Gallery</button><button onClick={() => go('quest')}><Gamepad2 size={19} /> Quest</button></div><div className="model-note"><Info size={18} /><p>This is a static visual preview. No 3D engine is running yet.</p></div></div>;
}

function QuestHub({ spots, unlockedSlugs, openQuiz, scanSpot }: { spots: Destination[]; unlockedSlugs: string[]; openQuiz: (spot: Destination) => void; scanSpot: (spot: Destination) => void }) {
  return <div className="screen quest-hub"><div className="quest-hub-head"><LightHeader title="Quests" showAvatar={false} /><small>DISCOVER · SCAN · LEARN</small><h1>Unlock local stories</h1><p>Scan a tourist spot marker in AR to unlock its questions.</p></div><section className="quest-destinations">{spots.map((destination) => {
    const unlocked = unlockedSlugs.includes(destination.slug);
    const dawisReady = destination.slug === 'dawis-heritage-wharf';
    return <article className={`quest-destination ${unlocked ? 'unlocked' : 'locked'}`} key={destination.slug}><Photo spot={destination}><div className="image-shade" /><span className="quest-lock">{unlocked ? <CheckCircle2 size={17} /> : <LockKeyhole size={17} />}</span></Photo><div><small>{destination.type}</small><h2>{destination.name}</h2><p>{unlocked ? dawisReady ? 'Quiz unlocked · 3 questions' : 'Marker scanned · quiz coming soon' : 'Scan this location marker to unlock'}</p>{unlocked && dawisReady ? <button onClick={() => openQuiz(destination)}>Start Quest <ChevronRight size={16} /></button> : !unlocked ? <button onClick={() => scanSpot(destination)}><Scan size={16} /> Scan marker</button> : <span className="quest-coming">Coming soon</span>}</div></article>;
  })}</section></div>;
}

function QuestScreen({ go, spot, userId, onComplete }: { go: (s: Screen) => void; spot: Destination; userId?: string; onComplete: (spot: Destination) => void }) {
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
    onComplete(spot);
    if (!userId || !quest) {
      setSaveMessage('Sign in to save quiz progress and XP.');
      return;
    }
    const { error } = await supabase.from('quiz_attempts').insert({
      user_id: userId,
      quest_id: quest.id,
      score: quest.questions.length,
      total_questions: quest.questions.length,
      xp_earned: quest.xpReward,
      completed_at: new Date().toISOString(),
    });
    setSaveMessage(error ? 'Quiz complete, but progress could not be saved.' : 'Progress saved to your account.');
  };

  if (complete && quest) return <div className="screen quest-screen"><Photo spot={spot} className="quest-complete"><div className="image-shade" /><div className="reward-orbit"><Award size={42} /><i /></div><small>QUEST COMPLETE</small><h1>{quest.title}<br />completed!</h1><div className="reward-total"><strong>+{quest.xpReward} XP</strong><span>{saveMessage || 'Saving your progress…'}</span></div><button onClick={() => go('explore')}>Continue Exploring <ChevronRight size={18} /></button></Photo></div>;
  if (loading) return <div className="screen quest-screen"><div className="quest-cover"><LightHeader title="Quest" showAvatar={false} /></div><section className="quiz-state"><ARLoader label="Loading your quest…" /></section></div>;
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

function AchievementsScreen({ back }: { back: () => void }) {
  const badges = [[Compass, 'First Explorer', 'First spot visited'], [Camera, 'AR Explorer', '3 AR scans'], [Trophy, 'Quiz Master', '10 quizzes'], [Medal, 'Digos Explorer', 'Level 4']];
  return <div className="screen achievements-screen"><LightHeader title="Achievements" back onBack={back} /><section className="xp-panel"><div className="award-halo"><Award size={34} /><span>4</span></div><small>DIGOS EXPLORER</small><h1>1,250 <span>Total XP</span></h1><div><p><span>Level 4</span><b>1,250 / 1,500 XP</b></p><Progress value={83} /></div></section><section className="badge-section"><header><div><small>COLLECTION</small><h2>Earned badges</h2></div><span>4 of 8</span></header><div className="badge-grid">{badges.map(([Icon, name, hint], i) => { const BadgeIcon = Icon as typeof Compass; return <div className={`badge badge-${i}`} key={name as string}><div><BadgeIcon size={25} /></div><strong>{name as string}</strong><small>{hint as string}</small></div> })}</div></section><section className="next-reward"><span><Gift size={24} /></span><div><small>NEXT REWARD</small><h3>Visit 6 more spots</h3><Progress value={40} /><p><span>4 visited</span><span>10 spots</span></p></div></section></div>;
}

function ProfileScreen({ go, user, profile, stats, onSignOut }: { go: (s: Screen) => void; user: User; profile: ProfileData | null; stats: DashboardStats | null; onSignOut: () => void }) {
  const items = [[Award, 'My Achievements'], [Trophy, 'Quest Progress'], [History, 'History'], [Settings, 'Settings'], [Info, 'About DigosAR']];
  const displayName = profile?.display_name || user.user_metadata?.display_name || 'Digos Explorer';
  const initials = displayName.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase();
  const xp = profile?.total_xp ?? 0;
  const level = profile?.level ?? 1;
  return <div className="screen profile-screen"><div className="profile-cover"><Photo spot={destinations[1]}><div className="image-shade" /><LightHeader title="Profile" /><div className="profile-identity"><div className="profile-avatar">{initials}<i><Leaf size={12} /></i></div><small>DIGOS EXPLORER</small><h1>{displayName}</h1><p>{user.email}</p></div></Photo></div><section className="profile-body"><div className="profile-stats"><div><strong>{xp}</strong><span>XP</span></div><div><strong>{stats?.spots_visited ?? 0}</strong><span>Spots</span></div><div><strong>{stats?.quizzes_completed ?? 0}</strong><span>Quizzes</span></div><div><strong>{stats?.badges_earned ?? 0}</strong><span>Badges</span></div></div><div className="progress-glass"><div><small>LEVEL {level} PROGRESS</small><strong>{xp % 500} / 500 XP</strong></div><Progress value={(xp % 500) / 5} /></div><div className="profile-menu">{items.map(([Icon, label], i) => { const ItemIcon = Icon as typeof Award; return <button key={label as string} onClick={i === 0 ? () => go('achievements') : undefined}><span><ItemIcon size={19} /></span><strong>{label as string}</strong><ChevronRight size={18} /></button> })}<button className="sign-out-item" onClick={onSignOut}><span><LogOut size={19} /></span><strong>Sign out</strong><ChevronRight size={18} /></button></div></section></div>;
}

function BottomNav({ active, go }: { active: Screen; go: (s: Screen) => void }) {
  return <nav className={`bottom-nav ${active === 'home' ? 'home-glass-nav' : ''}`} aria-label="Main navigation">{nav.map(({ screen, label, icon: Icon }) => <button key={screen} aria-label={label} className={`${screen === 'ar' ? 'ar-nav' : ''} ${active === screen ? 'active' : ''}`} onClick={() => go(screen)}>{screen === 'ar' ? <span className="ar-nav-mark"><Scan className="ar-nav-scan" size={35} strokeWidth={1.8} /><Cube className="ar-nav-cube" size={19} strokeWidth={1.8} /></span> : <><span><Icon size={20} /></span><small>{label}</small></>}</button>)}</nav>;
}

export default function DigosAR() {
  const [screen, setScreen] = useState<Screen>('home');
  const [spots, setSpots] = useState<Destination[]>(destinations);
  const [spot, setSpot] = useState(destinations[0]);
  const [previous, setPrevious] = useState<Screen>('home');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [spotsLoading, setSpotsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [recentTrail, setRecentTrail] = useState<RecentTrail | null>(null);
  const [unlockedQuestSlugs, setUnlockedQuestSlugs] = useState<string[]>([]);
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
    if (next === 'profile' && !user) {
      setTransitionLoading(true);
      window.setTimeout(() => window.location.assign('/login'), 650);
      return;
    }
    if (next === 'ar') {
      const trail = { slug: spot.slug, status: 'resume' as const, updatedAt: Date.now() };
      setRecentTrail(trail);
      window.localStorage.setItem('digosar-recent-trail', JSON.stringify(trail));
    }
    transitionTo(next);
  };
  const open = (d: Destination) => { setSpot(d); transitionTo('details') };
  const saveRecentTrail = (d: Destination, status: RecentTrail['status']) => {
    const trail = { slug: d.slug, status, updatedAt: Date.now() };
    setRecentTrail(trail);
    window.localStorage.setItem('digosar-recent-trail', JSON.stringify(trail));
  };
  const openAR = (d: Destination) => {
    saveRecentTrail(d, 'resume');
    setSpot(d);
    transitionTo('ar');
  };
  const unlockQuest = (d: Destination) => {
    setUnlockedQuestSlugs((current) => {
      if (current.includes(d.slug)) return current;
      const updated = [...current, d.slug];
      window.localStorage.setItem('digosar-unlocked-quests', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    const stored = window.localStorage.getItem('digosar-recent-trail');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as RecentTrail;
      if (parsed?.slug && (parsed.status === 'resume' || parsed.status === 'completed')) {
        // oxlint-disable-next-line react/react-compiler
        setRecentTrail(parsed);
      }
    } catch {
      window.localStorage.removeItem('digosar-recent-trail');
    }
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem('digosar-unlocked-quests');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as string[];
      // oxlint-disable-next-line react/react-compiler
      if (Array.isArray(parsed)) setUnlockedQuestSlugs(parsed.filter((slug) => typeof slug === 'string'));
    } catch {
      window.localStorage.removeItem('digosar-unlocked-quests');
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadTouristSpots().then((loaded) => {
      if (!active) return;
      setSpots(loaded);
      setSpot((current) => loaded.find((item) => item.slug === current.slug) ?? loaded[0]);
    }).catch(() => undefined).finally(() => { if (active) setSpotsLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      if (currentUser && new URLSearchParams(window.location.search).get('view') === 'profile') setScreen('profile');
    }).finally(() => { if (active) setAuthLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    // oxlint-disable-next-line react/react-compiler
    if (!user) { setProfile(null); setStats(null); setAccountLoading(false); return; }
    let active = true;
    if (screen === 'profile') setAccountLoading(true);
    void Promise.all([
      supabase.from('profiles').select('display_name, total_xp, level').eq('id', user.id).maybeSingle(),
      supabase.from('user_dashboard_stats').select('spots_visited, quizzes_completed, badges_earned').eq('user_id', user.id).maybeSingle(),
    ]).then(([profileResult, statsResult]) => {
      if (!active) return;
      if (profileResult.data) setProfile(profileResult.data as ProfileData);
      if (statsResult.data) setStats(statsResult.data as DashboardStats);
    }).finally(() => { if (active) setAccountLoading(false); });
    return () => { active = false; };
  }, [user, screen]);

  const signOut = async () => {
    setActionLoading(true);
    try {
      await supabase.auth.signOut({ scope: 'local' });
      setScreen('home');
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
  if (screen === 'home') content = <HomeScreen go={go} open={open} openAR={openAR} spots={spots} recentTrail={recentTrail} />;
  else if (screen === 'explore') content = <ExploreScreen open={open} spots={spots} />;
  else if (screen === 'details') content = <DetailsScreen spot={spot} go={go} userId={user?.id} />;
  else if (screen === 'ar') content = <ARScreen spot={spot} go={go} back={() => go(previous === 'ar' ? 'home' : previous)} onRecognized={unlockQuest} />;
  else if (screen === 'navigation') content = <NavigationScreen spot={spot} go={go} />;
  else if (screen === 'model') content = <ModelScreen spot={spot} go={go} />;
  else if (screen === 'quest') content = <QuestHub spots={spots} unlockedSlugs={unlockedQuestSlugs} scanSpot={openAR} openQuiz={(selectedSpot) => { setSpot(selectedSpot); transitionTo('quiz'); }} />;
  else if (screen === 'quiz') content = <QuestScreen go={go} spot={spot} userId={user?.id} onComplete={(completedSpot) => saveRecentTrail(completedSpot, 'completed')} />;
  else if (screen === 'achievements') content = <AchievementsScreen back={() => go('profile')} />;
  else if (!user) content = <HomeScreen go={go} open={open} openAR={openAR} spots={spots} recentTrail={recentTrail} />;
  else content = <ProfileScreen go={go} user={user} profile={profile} stats={stats} onSignOut={() => void signOut()} />;
  const isGloballyLoading = spotsLoading || authLoading || transitionLoading || accountLoading || actionLoading;
  const loadingLabel = transitionLoading ? 'Opening…' : accountLoading ? 'Loading your account…' : actionLoading ? 'Please wait…' : 'Preparing your DigosAR experience…';
  const usesDarkShell = ['home', 'explore', 'quest', 'quiz', 'achievements', 'profile'].includes(screen);
  return <main className="site-shell"><div className="desktop-brand"><Logo inverse /><h1>A new layer<br />of Digos.</h1><p>Immersive tourism. Local stories.<br />One AR-ready companion.</p><span>APP EXPERIENCE · SUPABASE READY</span></div><div className={`phone ${screen === 'home' ? 'home-phone' : ''} ${usesDarkShell ? 'dark-phone' : ''}`}><div className={`status-bar ${['home','ar','navigation'].includes(screen) ? 'light' : ''}`}><span>9:41</span><div><i /><i /><b /></div></div><div className="app-content">{content}</div><BottomNav active={active} go={go} />{isGloballyLoading && <div className="global-loading"><ARLoader label={loadingLabel} /></div>}</div><div className="desktop-index"><span>01</span><i /><span>FOREST GLASS</span></div></main>;
}
