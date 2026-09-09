'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Award, Box as Cube, Camera, ChevronRight, Clock3, Compass, Filter, Footprints, Gift, Home, Leaf, MapPin, Medal, Menu, Search, Settings, Sparkles, Star, Trophy, UserRound } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

type Screen = 'home' | 'explore' | 'details' | 'ar' | 'quest' | 'achievements' | 'profile';
type Destination = { name: string; location: string; description: string; type: string; best: string; distance: string; rating: string; position: string };

const destinations: Destination[] = [
  { name: 'Kapatagan', location: 'Digos City', rating: '4.9', type: 'Highland', best: 'Oct – May', distance: '26 km', position: 'center', description: 'Kapatagan is a highland barangay in Digos City known for its cool climate, breathtaking views, and peaceful atmosphere.' },
  { name: 'Dahilyan Park', location: 'Digos City', rating: '4.8', type: 'Adventure', best: 'Nov – Apr', distance: '18 km', position: 'bottom', description: 'A nature park with zipline, rides, welcoming gardens, and a relaxing mountain ambiance.' },
  { name: 'Digos Mother Tree', location: 'Digos City', rating: '4.7', type: 'Nature', best: 'Year-round', distance: '4.2 km', position: 'left', description: 'One of the biggest living trees in Asia, standing as a beloved natural landmark in the heart of Digos.' },
];

const nav = [
  { screen: 'home' as Screen, label: 'Home', icon: Home },
  { screen: 'explore' as Screen, label: 'Explore', icon: Compass },
  { screen: 'ar' as Screen, label: 'AR', icon: Camera },
  { screen: 'quest' as Screen, label: 'Quests', icon: Trophy },
  { screen: 'profile' as Screen, label: 'Profile', icon: UserRound },
];

function Logo() { return <div className="logo"><span className="logo-mark"><MapPin size={17} /><i /></span><span>Digos<strong>AR</strong></span></div> }

function AppHeader({ title, back, onBack }: { title?: string; back?: boolean; onBack?: () => void }) {
  return <header className="app-header">
    {back ? <button className="icon-button" onClick={onBack} aria-label="Go back"><ArrowLeft size={21} /></button> : title ? <button className="icon-button quiet" aria-label="Menu"><Menu size={21} /></button> : <Logo />}
    {title && <h1>{title}</h1>}
    <button className="avatar" aria-label="Profile"><span>DR</span></button>
  </header>
}

function Photo({ className = '', position = 'center', children }: { className?: string; position?: string; children?: React.ReactNode }) {
  return <div className={`photo ${className}`} style={{ backgroundPosition: position }}>{children}</div>
}

function HomeScreen({ go }: { go: (s: Screen) => void }) {
  return <div className="screen home-screen">
    <AppHeader />
    <section className="hero">
      <div className="route-line" aria-hidden="true"><span /><span /><span /></div>
      <p className="eyebrow"><Sparkles size={14} /> Your Digos adventure</p>
      <h1>Explore.<br /><em>Scan.</em> Play.</h1>
      <p>Your adventure starts here!</p>
      <button className="primary-button light" onClick={() => go('explore')}>Start exploring <ChevronRight size={18} /></button>
      <div className="hero-orbit"><Compass size={28} /><small>DISCOVER</small></div>
    </section>
    <section className="content-section popular">
      <div className="section-heading"><div><p className="kicker">Handpicked for you</p><h2>Popular spots</h2></div><button onClick={() => go('explore')}>View all</button></div>
      <div className="spot-scroll">
        {destinations.map((spot, i) => <button className="spot-card" key={spot.name} onClick={() => go('details')} aria-label={`View ${spot.name}`}>
          <Photo position={spot.position}><span className="number">0{i + 1}</span><span className="rating"><Star size={12} fill="currentColor" /> {spot.rating}</span></Photo>
          <div className="spot-copy"><h3>{spot.name}</h3><p><MapPin size={13} /> {spot.location}</p></div>
        </button>)}
      </div>
      <div className="stat-strip">
        <div><span className="stat-icon gold"><Sparkles size={19} /></span><p><strong>1,250</strong><small>XP points</small></p></div><span className="divider" /><div><span className="stat-icon green"><Medal size={19} /></span><p><strong>4</strong><small>Badges earned</small></p></div>
      </div>
    </section>
  </div>
}

function ExploreScreen({ open }: { open: (d: Destination) => void }) {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const visible = useMemo(() => destinations.filter(d => (category === 'All' || d.type === category) && d.name.toLowerCase().includes(query.toLowerCase())), [category, query]);
  return <div className="screen">
    <AppHeader title="Explore Digos" />
    <section className="explore-intro">
      <p>Find your next <em>story.</em></p>
      <div className="search-row"><label><Search size={19} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tourist spots..." /></label><button aria-label="Filter"><Filter size={20} /></button></div>
      <div className="chips" aria-label="Categories">{['All', 'Nature', 'Adventure', 'Culture', 'History'].map(c => <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div>
    </section>
    <section className="explore-list">
      <div className="result-count"><span>{visible.length} destinations</span><small>Near Digos City</small></div>
      {visible.map(spot => <button className="destination-card" key={spot.name} onClick={() => open(spot)}>
        <Photo position={spot.position}><span className="distance"><MapPin size={12} /> {spot.distance}</span></Photo>
        <div className="destination-copy"><div className="title-line"><div><h2>{spot.name}</h2><p><MapPin size={13} /> {spot.location}</p></div><ChevronRight size={19} /></div><p>{spot.description}</p><div className="card-bottom"><span>{spot.type}</span><strong>+100 XP</strong></div></div>
      </button>)}
      {!visible.length && <div className="empty"><Search size={28} /><h2>No trails found</h2><p>Try another name or category.</p></div>}
    </section>
  </div>
}

function DetailsScreen({ spot, go }: { spot: Destination; go: (s: Screen) => void }) {
  return <div className="screen detail-screen">
    <div className="detail-photo"><Photo position={spot.position}><div className="detail-top"><button className="glass-button" onClick={() => go('explore')} aria-label="Back"><ArrowLeft size={21} /></button><span className="detail-label">DISCOVER DIGOS</span><button className="glass-button" aria-label="Save"><Award size={20} /></button></div><div className="photo-index">01 <i /> 03</div></Photo></div>
    <article className="detail-sheet">
      <div className="detail-title"><div><p><MapPin size={14} /> {spot.location}</p><h1>{spot.name}</h1></div><span>+100 XP</span></div>
      <div className="detail-facts"><div><Leaf size={18} /><small>Type</small><strong>{spot.type}</strong></div><div><Clock3 size={18} /><small>Best time</small><strong>{spot.best}</strong></div><div><Footprints size={18} /><small>Distance</small><strong>{spot.distance}</strong></div></div>
      <section className="about"><p className="kicker">Know before you go</p><h2>About this place</h2><p>{spot.description}</p></section>
      <div className="detail-actions"><button className="primary-button" onClick={() => go('ar')}><Camera size={19} /> View in AR</button><button className="secondary-button" onClick={() => go('quest')}><Trophy size={19} /> Take quiz</button></div>
    </article>
  </div>
}

function ARScreen({ back }: { back: () => void }) {
  const [scanned, setScanned] = useState(false);
  return <div className="screen ar-screen"><Photo className="ar-photo" position="center">
    <div className="ar-shade" />
    <div className="ar-header"><button className="glass-button" onClick={back} aria-label="Back"><ArrowLeft size={21} /></button><div><span>AR Preview</span><h1>AR Scanner</h1></div><button className="glass-button" aria-label="3D model"><Cube size={20} /></button></div>
    <div className="ar-instruction"><span><Sparkles size={15} /></span><p>{scanned ? 'Surface detected! Tap the cube to explore.' : 'Move your phone slowly to detect a surface.'}</p></div>
    <div className={`scan-frame ${scanned ? 'found' : ''}`}><i /><i /><i /><i /><div className="scan-line" />{scanned && <div className="model-preview"><Cube size={54} /><span>Kapatagan viewpoint</span></div>}</div>
    <div className="ar-controls"><button className="model-button" aria-label="Open 3D models"><Cube size={22} /><small>Models</small></button><button className="shutter" onClick={() => setScanned(!scanned)} aria-label="Scan"><span><Camera size={26} /></span></button><div className="live-dot"><i /> LIVE</div></div>
  </Photo></div>
}

function QuestScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const answers = [['A', 'A historical church'], ['B', 'A highland with cool climate'], ['C', 'A white sand beach'], ['D', 'A commercial building']];
  return <div className="screen quest-screen">
    <AppHeader title="Quest" />
    <section className="quest-head"><div className="quest-level"><span><Trophy size={22} /></span><div><small>KAPATAGAN QUEST</small><strong>Trailblazer quiz</strong></div></div><div className="progress-copy"><span>Question 1 of 5</span><strong>20%</strong></div><Progress value={20} className="quest-progress" /></section>
    <section className="question-card"><span className="question-number">01</span><p className="kicker">Choose one answer</p><h1>What is Kapatagan known for?</h1><div className="answers">{answers.map(([letter, text]) => { const isCorrect = letter === 'B'; const state = submitted && selected === letter ? (isCorrect ? 'correct' : 'wrong') : submitted && isCorrect ? 'correct' : selected === letter ? 'selected' : ''; return <button key={letter} className={state} onClick={() => { setSelected(letter); setSubmitted(false) }}><span>{letter}</span><p>{text}</p>{state === 'correct' && <strong>✓</strong>}{state === 'wrong' && <strong>×</strong>}</button> })}</div><button className="primary-button submit" disabled={!selected} onClick={() => setSubmitted(true)}>{submitted ? (selected === 'B' ? 'Correct answer!' : 'Try again') : 'Submit answer'} <ChevronRight size={18} /></button><p className="reward"><Sparkles size={16} /> +50 XP for a correct answer</p></section>
  </div>
}

function AchievementsScreen({ back }: { back: () => void }) {
  const badges = [[Compass, 'First Explorer', 'First spot visited'], [Camera, 'AR Explorer', '3 AR scans'], [Trophy, 'Quiz Master', '10 quizzes'], [Medal, 'Digos Explorer', 'Level 4']];
  return <div className="screen achievements-screen">
    <AppHeader title="Achievements" back onBack={back} />
    <section className="level-card"><div className="level-orbit"><Award size={35} /><span>4</span></div><p>YOUR JOURNEY</p><h1>1,250 <span>Total XP</span></h1><h2>Level 4 · Digos Explorer</h2><div className="level-progress"><div><span>1,250 / 1,500 XP</span><strong>250 XP to go</strong></div><Progress value={83} /></div></section>
    <section className="badge-section"><div className="section-heading"><div><p className="kicker">Collected along the way</p><h2>Your badges</h2></div><span>4 / 8</span></div><div className="badge-grid">{badges.map(([Icon, name, hint], i) => { const BadgeIcon = Icon as typeof Compass; return <div className="badge-card" key={name as string}><div className={`badge-medal tone-${i}`}><BadgeIcon size={25} /></div><strong>{name as string}</strong><small>{hint as string}</small></div> })}</div></section>
    <section className="next-reward"><div className="gift"><Gift size={25} /></div><div><small>NEXT REWARD</small><h2>Visit 6 more spots</h2><Progress value={40} /><p><span>4 visited</span><span>10 spots</span></p></div></section>
  </div>
}

function ProfileScreen({ achievements }: { achievements: () => void }) {
  const items = [[Award, 'My Achievements'], [Clock3, 'History'], [Settings, 'Settings'], [Leaf, 'About DigosAR']];
  return <div className="screen profile-screen">
    <AppHeader title="Profile" />
    <section className="profile-hero"><div className="profile-avatar"><span>DR</span><i><Leaf size={13} /></i></div><h1>Digos Explorer</h1><p>explorer@digosar.com</p><span className="level-pill">Level 4</span></section>
    <section className="profile-stats"><div><strong>1,250</strong><span>XP Points</span></div><div><strong>5</strong><span>Spots Visited</span></div><div><strong>12</strong><span>Quizzes</span></div><div><strong>4</strong><span>Badges</span></div></section>
    <section className="profile-menu"><p className="kicker">Your DigosAR</p>{items.map(([Icon, label], i) => { const ItemIcon = Icon as typeof Award; return <button key={label as string} onClick={i === 0 ? achievements : undefined}><span><ItemIcon size={19} /></span><strong>{label as string}</strong><ChevronRight size={19} /></button> })}</section>
    <div className="profile-quote"><Leaf size={18} /><p>Every trail tells a Digos story.</p></div>
  </div>
}

function BottomNav({ active, go }: { active: Screen; go: (s: Screen) => void }) {
  return <nav className="bottom-nav" aria-label="Main navigation">{nav.map(({ screen, label, icon: Icon }) => <button key={screen} className={`${screen === 'ar' ? 'ar-nav' : ''} ${active === screen ? 'active' : ''}`} onClick={() => go(screen)} aria-label={label}><span><Icon size={screen === 'ar' ? 25 : 21} /></span><small>{label}</small></button>)}</nav>
}

export default function DigosAR() {
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedSpot, setSelectedSpot] = useState(destinations[0]);
  const [previous, setPrevious] = useState<Screen>('home');
  const go = (next: Screen) => { setPrevious(screen); setScreen(next); window.scrollTo({ top: 0, behavior: 'smooth' }) };
  useEffect(() => {
    const modelContext = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    const allowed: Screen[] = ['home', 'explore', 'ar', 'quest', 'achievements', 'profile'];
    void Promise.resolve(modelContext.registerTool({
      name: 'open_digosar_screen',
      title: 'Open a DigosAR screen',
      description: 'Navigate the visible DigosAR prototype to one of its main screens.',
      inputSchema: { type: 'object', properties: { screen: { type: 'string', enum: allowed } }, required: ['screen'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const requested = (input as { screen?: Screen })?.screen;
        if (!requested || !allowed.includes(requested)) throw new Error('Unknown DigosAR screen.');
        setScreen(requested);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return { screen: requested, status: 'opened' };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);
  const active = screen === 'details' ? 'explore' : screen === 'achievements' ? 'profile' : screen;
  let content: React.ReactNode;
  if (screen === 'home') content = <HomeScreen go={go} />;
  else if (screen === 'explore') content = <ExploreScreen open={(d) => { setSelectedSpot(d); go('details') }} />;
  else if (screen === 'details') content = <DetailsScreen spot={selectedSpot} go={go} />;
  else if (screen === 'ar') content = <ARScreen back={() => setScreen(previous === 'ar' ? 'home' : previous)} />;
  else if (screen === 'quest') content = <QuestScreen />;
  else if (screen === 'achievements') content = <AchievementsScreen back={() => go('profile')} />;
  else content = <ProfileScreen achievements={() => go('achievements')} />;
  return <main className="site-shell"><div className="desktop-brand"><Logo /><p>Discover Digos City<br />in a new way.</p><div className="desktop-note"><span><Camera size={18} /></span> Interactive mobile prototype</div></div><div className="phone"><div className="status-bar" aria-hidden="true"><span>9:41</span><div><i /><i /><b /></div></div><div className="app-content">{content}</div><BottomNav active={active} go={go} /></div><p className="desktop-caption">Explore · Scan · Play</p></main>
}
