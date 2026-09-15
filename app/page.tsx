'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Award, Bell, Box as Cube, Camera, CheckCircle2, ChevronRight, Church,
  Clock3, Compass, Filter, Footprints, Gamepad2, Gift,
  History, Home, Image, Info, Landmark, Leaf, LockKeyhole, LogOut, Map, MapPin, Medal,
  Navigation, PlayCircle, Route, Scan, Search, Settings, Sparkles, Star, Trophy, UserRound,
  Volume2, Eye, EyeOff,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import {
  fallbackDestinations, loadQuestForSpot, loadRecentAdventures, loadTouristSpots, loadWeeklyHeritageProgress,
  type Destination, type RecentAdventure, type SpotQuest,
} from '@/lib/digosar-data';
import { ARLoader } from '@/components/ar-loader';
import { ARCameraScreen } from '@/components/ar-camera-screen';
import { ChallengeCard, type Challenge } from '@/components/challenge-card';
import { ExploreMascotGuide } from '@/components/explore-mascot-guide';
import { MascotGuide } from '@/components/mascot-guide';
import { QuestMascotGuide } from '@/components/quest-mascot-guide';
import { SpotMascotGuide } from '@/components/spot-mascot-guide';
import { ProfileHero } from '@/components/profile-hero';
import { usernameToAuthEmail } from '@/lib/auth';

type Screen = 'home' | 'explore' | 'details' | 'ar' | 'quest' | 'quiz' | 'achievements' | 'profile' | 'navigation' | 'model';
type ProfileData = { display_name: string; username: string; total_xp: number; level: number };
type DashboardStats = { spots_visited: number; quizzes_completed: number; badges_earned: number };
type RecentTrail = { slug: string; status: 'resume' | 'completed'; updatedAt: number };

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

function SpotCategoryIcon({ type, size = 20 }: { type: string; size?: number }) {
  const normalized = type.toLowerCase();
  const Icon = normalized === 'nature' ? Leaf : normalized === 'heritage' ? Landmark : normalized === 'culture' ? Church : History;
  return <Icon size={size} aria-hidden="true" />;
}

function HomeScreen({ go, open, openAR, spots, recentTrail, displayName, challengeProgress }: { go: (s: Screen) => void; open: (d: Destination) => void; openAR: (d: Destination) => void; spots: Destination[]; recentTrail: RecentTrail | null; displayName: string; challengeProgress: number }) {
  const [query, setQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const recentSpot = recentTrail ? spots.find((item) => item.slug === recentTrail.slug) ?? null : null;
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
      <section className={`home-recent-trail ${recentTrail?.status === 'completed' ? 'completed' : ''}`}><small>CONTINUE YOUR TRAIL</small>{recentSpot ? <div><span><Route size={18} /></span><p><strong>{recentSpot.name}</strong><small>{recentSpot.distance} away · latest AR trail</small></p><button onClick={() => recentTrail?.status === 'completed' ? open(recentSpot) : openAR(recentSpot)}>{recentTrail?.status === 'completed' ? <><CheckCircle2 size={14} /> Completed</> : 'Resume'}</button></div> : <div><span><Route size={18} /></span><p><strong>No recent AR trail</strong><small>Open a destination in AR to start one.</small></p><button onClick={() => go('explore')}>Explore</button></div>}</section>
      <div className="popular-head"><div><small>CURATED FOR YOU</small><h2>Popular Tourist Spots</h2></div><button onClick={() => go('explore')}>View all</button></div>
      <div className="popular-rail">{spots.map((spot) => <button className="popular-card" aria-label={`Open ${spot.name}`} key={spot.slug} onClick={() => open(spot)}>
        <Photo spot={spot}><span className={`card-category-icon category-${spot.type.toLowerCase()}`} aria-label={spot.type}><SpotCategoryIcon type={spot.type} /></span><div className="card-glass"><div><small>{spot.type}</small><h3>{spot.name}</h3><p><Footprints size={12} /> {spot.distance}</p></div><strong>+{spot.xpReward} XP</strong></div></Photo>
      </button>)}</div>
      <ChallengeCard challenge={{ ...weeklyChallenge, progress: challengeProgress }} onContinue={() => go('explore')} />
    </div>
  </div>;
}

function ExploreScreen({ open, spots }: { open: (d: Destination) => void; spots: Destination[] }) {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const visible = useMemo(() => spots.filter(d => (category === 'All' || d.type === category) && d.name.toLowerCase().includes(query.toLowerCase())), [spots, category, query]);
  return <div className="screen explore-screen"><div className="dark-cap explore-title-cap"><LightHeader title="Explore Digos" showAvatar={false} /><p>Every place holds a story.</p></div><div className="explore-sticky-tools"><div className="explore-controls-surface"><div className="explore-search"><Search size={19} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tourist spots..." /><Filter size={18} /></div><div className="explore-chips">{['All', 'Nature', 'Heritage', 'Culture', 'History'].map(c => <button className={category === c ? 'active' : ''} onClick={() => setCategory(c)} key={c}>{c}</button>)}</div><ExploreMascotGuide message="Let’s explore Digos!" secondaryMessage="Pick a place to discover." /></div></div>
    <section className="visual-list"><div className="list-heading"><span>{visible.length} places</span><small>Interactive city guides</small></div>{visible.map(spot => <button className="visual-card" aria-label={`Open ${spot.name}`} key={spot.slug} onClick={() => open(spot)}><Photo spot={spot}><div className="image-shade" /><div className="visual-top"><span><Star size={12} fill="currentColor" /> {spot.rating}</span><i><ChevronRight size={19} /></i></div><div className="visual-copy"><small>{spot.type}</small><h2>{spot.name}</h2><p>{spot.description}</p><div><span><MapPin size={12} /> {spot.distance}</span><strong>+{spot.xpReward} XP</strong></div></div></Photo></button>)}{!visible.length && <div className="empty"><Search size={28} /><h2>No places found</h2><p>Try another name or category.</p></div>}</section>
  </div>;
}

function DetailsScreen({ spot, go }: { spot: Destination; go: (s: Screen) => void }) {
  return <div className="screen detail-screen"><Photo spot={spot} className="detail-hero"><div className="image-shade" /><div className="detail-top"><GlassIcon label="Back" onClick={() => go('explore')}><ArrowLeft size={20} /></GlassIcon></div><div className="detail-image-title"><small>{spot.type} · {spot.distance}</small><h1>{spot.name}</h1></div></Photo>
    <article className="info-sheet"><span className="sheet-handle" aria-hidden="true" /><div className="spot-meta"><p><MapPin size={13} /> {spot.location}</p><span>+100 XP</span></div><h1>{spot.name}</h1><div className="fact-row"><div><Leaf size={17} /><span><small>Category</small><strong>{spot.type}</strong></span></div><div><Clock3 size={17} /><span><small>Best time</small><strong>{spot.best}</strong></span></div><div><Footprints size={17} /><span><small>Distance</small><strong>{spot.distance}</strong></span></div></div>
      <section className="story"><small>ABOUT</small><h2>A place worth knowing</h2><p>{spot.description}</p></section>
      <section className="story-columns"><div><History size={19} /><h3>History</h3><p>{spot.history}</p></div><div><Medal size={19} /><h3>Cultural significance</h3><p>{spot.culture}</p></div></section>
      <div className="media-preview"><Photo spot={spot}><PlayCircle size={34} /><span><small>MULTIMEDIA PREVIEW</small><strong>Watch the local story</strong></span></Photo><button onClick={() => go('model')}><Cube size={18} /> View 3D Model</button></div>
      <div className="detail-bottom-actions"><button onClick={() => go('quest')}><Gamepad2 size={18} /> Quest</button><button onClick={() => go('navigation')}><Navigation size={18} fill="currentColor" /> Go</button></div>
    </article><SpotMascotGuide initialMessage="Scroll down for more details about this spot!" />
  </div>;
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
  })}</section><QuestMascotGuide initialMessage="Hmm… which story will you unlock first?" secondaryMessage="Scan a tourist spot marker to begin." /></div>;
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

function ProfileScreen({ user, profile, stats, recentAdventures, recentAdventuresLoading, spots, onSignOut, refreshProfile, signingOut }: { user: User; profile: ProfileData; stats: DashboardStats | null; recentAdventures: RecentAdventure[]; recentAdventuresLoading: boolean; spots: Destination[]; onSignOut: () => void; refreshProfile: () => Promise<void>; signingOut: boolean }) {
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
  const nextLevelXP = 500 - levelXP;
  const visibleAdventures = recentAdventures.flatMap((activity) => {
    const activitySpot = spots.find((item) => item.id === activity.spotId);
    return activitySpot ? [{ activity, spot: activitySpot }] : [];
  });
  const badgeConcepts = [[Landmark, 'Heritage Explorer'], [Leaf, 'Nature Seeker'], [Scan, 'AR Discoverer'], [Route, 'Trail Streak']];
  const categories = ['Heritage', 'Nature', 'History', 'Culture'];
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
    <div className="profile-top"><header className="light-header profile-header"><span className="header-spacer" aria-hidden="true" /><h1>Profile</h1><button type="button" aria-label="Open profile settings" title="Profile settings" onClick={() => { setDraftDisplayName(displayName); setSettingsError(''); setSettingsNotice(''); setSettingsOpen(true); }}><Settings size={19} /></button></header><ProfileHero displayName={displayName} username={username} level={level} rank={rank} /></div>
    <section className="profile-body">
      <div className="profile-xp-card"><div><small>LEVEL {level} PROGRESS</small><strong>{levelXP} / 500 XP</strong></div><Progress value={(levelXP / 500) * 100} /><p>{nextLevelXP} XP until Level {level + 1}</p></div>
      <div className="profile-stats"><div><strong>{xp}</strong><span>XP</span></div><div><strong>{stats?.spots_visited ?? 0}</strong><span>Spots</span></div><div><strong>{stats?.quizzes_completed ?? 0}</strong><span>Quizzes</span></div><div><strong>{stats?.badges_earned ?? 0}</strong><span>Badges</span></div></div>
      <section className="profile-section profile-achievements-preview"><header><div><small>EXPLORER COLLECTION</small><h2>Achievements</h2></div></header><div className="profile-horizontal-rail">{badgeConcepts.map(([Icon, title]) => { const BadgeIcon = Icon as typeof Landmark; return <article className="profile-badge locked" key={title as string}><span><BadgeIcon size={20} /><LockKeyhole size={10} /></span><strong>{title as string}</strong></article> })}</div>{(stats?.badges_earned ?? 0) > 0 && <p className="profile-data-note">{stats?.badges_earned} earned badge{stats?.badges_earned === 1 ? '' : 's'} in your synced collection.</p>}</section>
      <section className="profile-section profile-category-progress"><header><div><small>DISCOVERY MAP</small><h2>Explorer Progress</h2></div></header><div className="profile-horizontal-rail profile-progress-rail">{categories.map((category) => { const target = spots.filter((item) => item.type === category).length; return <article className="profile-category-card" key={category}><p><strong>{category}</strong><span>— / {target}</span></p><Progress value={0} /></article> })}</div><p className="profile-data-note">Category progress will appear after visited spots are connected by category.</p></section>
      <section className="profile-section profile-recent"><header><div><small>YOUR JOURNEY</small><h2>Recent Adventures</h2></div></header>{recentAdventuresLoading ? <div className="profile-recent-loading"><i /><span>Loading adventures…</span></div> : visibleAdventures.length ? visibleAdventures.map(({ activity, spot: activitySpot }) => <article key={`${activity.status}-${activity.occurredAt}-${activity.spotId}`}><span><Route size={19} /></span><div><strong>{activitySpot.name}</strong><p>{activity.status === 'completed' ? `Completed activity • +${activitySpot.xpReward} XP` : activity.status === 'ar-scan' ? 'Completed AR discovery' : 'Visited tourist spot'}</p></div></article>) : <div className="profile-empty"><Compass size={22} /><p><strong>No adventures yet.</strong><span>Start exploring Digos to build your journey.</span></p></div>}</section>
      <nav className="profile-menu profile-account-menu" aria-label="Account options"><button><span><Info size={19} /></span><strong>About DigosAR</strong><ChevronRight size={18} /></button><button className="sign-out-item" onClick={() => setSignOutOpen(true)}><span><LogOut size={19} /></span><strong>Sign out</strong><ChevronRight size={18} /></button></nav>
    </section>
    {settingsOpen && <div className="profile-settings-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}><dialog open className="profile-settings-dialog" aria-labelledby="profile-settings-title"><header><div><small>ACCOUNT</small><h2 id="profile-settings-title">Profile settings</h2></div><button type="button" onClick={() => setSettingsOpen(false)} aria-label="Close profile settings">×</button></header><form onSubmit={saveProfileSettings}><label><span>Display name</span><input required maxLength={50} value={draftDisplayName} onChange={(event) => setDraftDisplayName(event.target.value)} /></label><label><span>Username</span><input value={`@${username}`} readOnly aria-describedby="username-readonly-note" /></label><p id="username-readonly-note">Username changes are not available yet.</p><button className="profile-settings-save" disabled={settingsSaving || passwordSaving}>{settingsSaving ? 'Saving…' : 'Save display name'}</button></form><div className="profile-settings-divider" /><form onSubmit={changePassword}><div className="profile-settings-section-title"><small>SECURITY</small><strong>Change password</strong></div>{passwordField('Current password', currentPassword, setCurrentPassword, 'current')}{passwordField('New password', newPassword, setNewPassword, 'next')}{passwordField('Confirm new password', confirmPassword, setConfirmPassword, 'confirm')}{settingsError && <p className="auth-error">{settingsError}</p>}{settingsNotice && <p className="auth-notice">{settingsNotice}</p>}<button className="profile-settings-save" disabled={passwordSaving || settingsSaving}>{passwordSaving ? 'Updating…' : 'Change password'}</button></form></dialog></div>}
    {signOutOpen && <div className="signout-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !signingOut) setSignOutOpen(false); }}><dialog open className="signout-confirm-dialog" aria-labelledby="signout-confirm-title"><h2 id="signout-confirm-title">Sign out?</h2><p>Are you sure you want to sign out of DigosAR?</p><div><button type="button" disabled={signingOut} onClick={() => setSignOutOpen(false)}>Cancel</button><button type="button" className="confirm" disabled={signingOut} onClick={onSignOut}>{signingOut ? 'Signing out…' : 'Sign out'}</button></div></dialog></div>}
  </div>;
}

function BottomNav({ active, go, visible, onInteractionChange }: { active: Screen; go: (s: Screen) => void; visible: boolean; onInteractionChange: (active: boolean) => void }) {
  return <nav className={`bottom-nav ${active === 'home' ? 'home-glass-nav' : ''} ${visible ? '' : 'is-hidden'}`} aria-label="Main navigation" onPointerDown={() => onInteractionChange(true)} onPointerUp={() => onInteractionChange(false)} onPointerCancel={() => onInteractionChange(false)} onFocusCapture={() => onInteractionChange(true)} onBlurCapture={() => onInteractionChange(false)}>{nav.map(({ screen, label, icon: Icon }) => <button key={screen} aria-label={label} className={`${screen === 'ar' ? 'ar-nav' : ''} ${active === screen ? 'active' : ''}`} onClick={() => go(screen)}>{screen === 'ar' ? <span className="ar-nav-mark"><Scan className="ar-nav-scan" size={35} strokeWidth={1.8} /><Cube className="ar-nav-cube" size={19} strokeWidth={1.8} /></span> : <><span><Icon size={20} /></span><small>{label}</small></>}</button>)}</nav>;
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
  const [recentAdventures, setRecentAdventures] = useState<RecentAdventure[]>([]);
  const [recentAdventuresLoading, setRecentAdventuresLoading] = useState(false);
  const [challengeProgress, setChallengeProgress] = useState(0);
  const [spotsLoading, setSpotsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [authToast, setAuthToast] = useState('');
  const [bootStage, setBootStage] = useState('app shell');
  const [bootTimedOut, setBootTimedOut] = useState(false);
  const authRedirectTimerRef = useRef<number | null>(null);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const navInteractingRef = useRef(false);
  const [recentTrail, setRecentTrail] = useState<RecentTrail | null>(null);
  const [unlockedQuestSlugs, setUnlockedQuestSlugs] = useState<string[]>([]);
  const markBoot = useCallback((stage: string) => {
    if (!import.meta.env.DEV) return;
    console.info(`[DigosAR Boot] ${stage}`);
    setBootStage(stage);
  }, []);
  useEffect(() => {
    markBoot('root mounted');
    const timeout = window.setTimeout(() => {
      console.error('[DigosAR Boot ERROR] Startup exceeded 8 seconds.');
      setBootTimedOut(true);
    }, 8000);
    return () => window.clearTimeout(timeout);
  }, [markBoot]);
  const refreshProfile = useCallback(async () => {
    if (!user) { setProfile(null); setProfileLoading(false); return; }
    setProfileLoading(true);
    const { data, error } = await supabase.from('profiles').select('display_name, username, total_xp, level').eq('id', user.id).single();
    if (!error && data) setProfile(data as ProfileData);
    else setProfile(null);
    setProfileLoading(false);
  }, [user]);
  const refreshRecentAdventures = useCallback(async () => {
    if (!user) { setRecentAdventures([]); setRecentAdventuresLoading(false); return; }
    setRecentAdventuresLoading(true);
    try { setRecentAdventures(await loadRecentAdventures(user.id)); }
    catch { setRecentAdventures([]); }
    finally { setRecentAdventuresLoading(false); }
  }, [user]);
  const refreshRecentTrail = useCallback(async () => {
    if (!user) return;
    try {
      const latest = (await loadRecentAdventures(user.id))[0];
      if (!latest) { setRecentTrail(null); return; }
      const latestSpot = spots.find((item) => item.id === latest.spotId);
      if (!latestSpot) return;
      setRecentTrail({ slug: latestSpot.slug, status: latest.status === 'completed' ? 'completed' : 'resume', updatedAt: Date.parse(latest.occurredAt) });
    } catch {
      // Keep the optimistic local trail if Supabase is temporarily unavailable.
    }
  }, [user, spots]);
  const refreshChallengeProgress = useCallback(async () => {
    if (!user) { setChallengeProgress(0); return; }
    try { setChallengeProgress(Math.min(await loadWeeklyHeritageProgress(user.id), weeklyChallenge.target)); }
    catch { setChallengeProgress(0); }
  }, [user]);
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
    if (next === 'ar') {
      const trail = { slug: spot.slug, status: 'resume' as const, updatedAt: Date.now() };
      setRecentTrail(trail);
      window.localStorage.setItem('digosar-recent-trail', JSON.stringify(trail));
    }
    transitionTo(next);
  };
  useEffect(() => () => {
    if (authRedirectTimerRef.current !== null) window.clearTimeout(authRedirectTimerRef.current);
  }, []);

  useEffect(() => {
    // oxlint-disable-next-line react/react-compiler
    if (screen === 'profile' && user) void refreshRecentAdventures();
  }, [screen, user, refreshRecentAdventures]);
  useEffect(() => {
    // Challenge progress is refreshed as the user returns to Home/Profile.
    // oxlint-disable-next-line react/react-compiler
    if (user) void refreshChallengeProgress();
    else setChallengeProgress(0);
  }, [screen, user, refreshChallengeProgress]);
  useEffect(() => {
    if (screen === 'home' && user) void refreshRecentTrail();
  }, [screen, user, refreshRecentTrail]);
  const open = (d: Destination) => { setSpot(d); transitionTo('details') };
  const saveRecentTrail = (d: Destination, status: RecentTrail['status']) => {
    const trail = { slug: d.slug, status, updatedAt: Date.now() };
    setRecentTrail(trail);
    window.localStorage.setItem('digosar-recent-trail', JSON.stringify(trail));
  };
  const openAR = (d: Destination) => {
    saveRecentTrail(d, 'resume');
    if (user && d.id) {
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
    const scrollArea = document.querySelector<HTMLElement>('.app-content');
    const mobile = window.matchMedia('(max-width: 820px)');
    if (!scrollArea) return;

    let previousScroll = scrollArea.scrollTop;
    let frame: number | null = null;
    const update = () => {
      frame = null;
      const currentScroll = scrollArea.scrollTop;
      const delta = currentScroll - previousScroll;
      const isScrollable = scrollArea.scrollHeight > scrollArea.clientHeight + 1;
      const keepVisible = !mobile.matches || !isScrollable || currentScroll < 80 || navInteractingRef.current || ['ar', 'navigation', 'model'].includes(screen);

      if (keepVisible) setIsNavVisible(true);
      else if (delta >= 10) setIsNavVisible(false);
      else if (delta <= -10) setIsNavVisible(true);

      if (Math.abs(delta) >= 10 || keepVisible) previousScroll = currentScroll;
    };
    const handleScroll = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };
    const handleViewport = () => {
      previousScroll = scrollArea.scrollTop;
      setIsNavVisible(true);
    };

    scrollArea.addEventListener('scroll', handleScroll, { passive: true });
    mobile.addEventListener('change', handleViewport);
    handleViewport();
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      scrollArea.removeEventListener('scroll', handleScroll);
      mobile.removeEventListener('change', handleViewport);
    };
  }, [screen]);

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
    if (!user) { setProfile(null); setStats(null); setRecentAdventures([]); setProfileLoading(false); setAccountLoading(false); return; }
    let active = true;
    // oxlint-disable-next-line react/react-compiler
    setAccountLoading(true);
    markBoot('profile fetch started');
    void Promise.all([refreshProfile(), supabase.from('user_dashboard_stats').select('spots_visited, quizzes_completed, badges_earned').eq('user_id', user.id).maybeSingle()]).then(([, statsResult]) => {
      if (!active) return;
      if (statsResult.data) setStats(statsResult.data as DashboardStats);
    }).catch((error) => { console.error('[DigosAR Boot ERROR] Account fetch failed', error); }).finally(() => { if (active) { setAccountLoading(false); markBoot('profile fetch finished'); } });
    return () => { active = false; };
  }, [user, refreshProfile, markBoot]);

  const signOut = async () => {
    setActionLoading(true);
    try {
      await supabase.auth.signOut({ scope: 'local' });
      setUser(null);
      setProfile(null);
      setStats(null);
      setRecentAdventures([]);
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
  if (screen === 'home') content = <HomeScreen go={go} open={open} openAR={openAR} spots={spots} recentTrail={recentTrail} displayName={profileLoading ? '' : profile?.display_name || 'Explorer'} challengeProgress={challengeProgress} />;
  else if (screen === 'explore') content = <ExploreScreen open={open} spots={spots} />;
  else if (screen === 'details') content = <DetailsScreen spot={spot} go={go} />;
  else if (screen === 'ar') content = <ARCameraScreen onBack={() => go(previous === 'ar' ? 'home' : previous)} />;
  else if (screen === 'navigation') content = <NavigationScreen spot={spot} go={go} />;
  else if (screen === 'model') content = <ModelScreen spot={spot} go={go} />;
  else if (screen === 'quest') content = <QuestHub spots={spots} unlockedSlugs={unlockedQuestSlugs} scanSpot={openAR} openQuiz={(selectedSpot) => { setSpot(selectedSpot); transitionTo('quiz'); }} />;
  else if (screen === 'quiz') content = <QuestScreen go={go} spot={spot} userId={user?.id} onComplete={(completedSpot) => saveRecentTrail(completedSpot, 'completed')} />;
  else if (screen === 'achievements') content = <AchievementsScreen back={() => go('profile')} />;
  else if (!user) content = <HomeScreen go={go} open={open} openAR={openAR} spots={spots} recentTrail={recentTrail} displayName="Explorer" challengeProgress={0} />;
  else if (!profile) content = <div className="screen profile-screen" />;
  else content = <ProfileScreen user={user} profile={profile} stats={stats} recentAdventures={recentAdventures} recentAdventuresLoading={recentAdventuresLoading} spots={spots} onSignOut={() => void signOut()} refreshProfile={refreshProfile} signingOut={actionLoading} />;
  const isGloballyLoading = !bootTimedOut && (spotsLoading || authLoading || profileLoading || transitionLoading || accountLoading || actionLoading);
  const loadingLabel = transitionLoading ? 'Opening…' : accountLoading ? 'Loading your account…' : actionLoading ? 'Please wait…' : 'Preparing your DigosAR experience…';
  const usesDarkShell = ['home', 'explore', 'quest', 'quiz', 'achievements', 'profile'].includes(screen);
  return <main className="site-shell"><div className="desktop-brand"><Logo inverse /><h1>A new layer<br />of Digos.</h1><p>Immersive tourism. Local stories.<br />One AR-ready companion.</p><span>WEB APP EXPERIENCE</span></div><div className={`phone ${screen === 'home' ? 'home-phone' : ''} ${screen === 'ar' ? 'ar-phone' : ''} ${usesDarkShell ? 'dark-phone' : ''} ${isGloballyLoading ? 'is-loading' : ''}`}>{screen !== 'ar' && <div className={`status-bar ${['home','navigation'].includes(screen) ? 'light' : ''}`}><span>9:41</span><div><i /><i /><b /></div></div>}<div className="app-content">{content}</div>{screen !== 'ar' && <BottomNav active={active} go={go} visible={isNavVisible} onInteractionChange={(interacting) => { navInteractingRef.current = interacting; if (interacting) setIsNavVisible(true); }} />}{authToast && <output className="auth-required-toast">{authToast}</output>}{isGloballyLoading && <div className="global-loading"><ARLoader label={loadingLabel} /></div>}{import.meta.env.DEV && <output className="boot-debug-overlay">BOOT: {bootStage}{bootTimedOut ? ' · timeout' : ''}</output>}{bootTimedOut && <div className="boot-timeout"><strong>DigosAR is taking longer than expected to load.</strong><button type="button" onClick={() => window.location.reload()}>Retry</button></div>}</div><div className="desktop-index"><span>01</span><i /><span>FOREST GLASS</span></div></main>;
}
