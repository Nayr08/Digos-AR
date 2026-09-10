'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Award, Box as Cube, Camera, CheckCircle2, ChevronDown, ChevronRight,
  Clock3, Compass, Expand, Filter, Flashlight, Footprints, Gamepad2, Gift, Heart,
  History, Home, Image, Info, Leaf, Map, MapPin, Medal, Menu, Navigation, PlayCircle,
  Search, Settings, Sparkles, Star, Trophy, UserRound, Volume2,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

type Screen = 'home' | 'explore' | 'details' | 'ar' | 'quest' | 'achievements' | 'profile' | 'navigation' | 'model';
type Destination = {
  name: string; location: string; description: string; type: string; best: string;
  distance: string; rating: string; image: string; position: string; history: string; culture: string;
};

const destinations: Destination[] = [
  { name: 'Kapatagan', location: 'Digos City', rating: '4.9', type: 'Highland', best: 'Oct – May', distance: '26 km', image: '/digos-highlands.png', position: 'center', description: 'A cool highland escape with sweeping mountain views, misty mornings, and peaceful farm trails.', history: 'Kapatagan grew from a farming community into one of the city’s best-known gateways to the Mount Apo landscape.', culture: 'Local farms, mountain hospitality, and seasonal produce shape the rhythm of everyday life here.' },
  { name: 'Digos Mother Tree', location: 'Digos City', rating: '4.8', type: 'Nature', best: 'Year-round', distance: '4.2 km', image: '/digos-mother-tree.png', position: 'center', description: 'A monumental living tree whose vast canopy has become a treasured natural landmark.', history: 'Generations of residents have gathered beneath its shade, making the tree part of the city’s shared memory.', culture: 'The landmark represents stewardship, longevity, and the close relationship between Digos and nature.' },
  { name: 'Mt. Apo View Trail', location: 'Kapatagan', rating: '4.9', type: 'Adventure', best: 'Nov – Apr', distance: '29 km', image: '/digos-highlands.png', position: '65% center', description: 'A scenic highland trail with dramatic views toward the country’s highest mountain.', history: 'The surrounding highlands have long connected communities, farms, and routes toward Mount Apo.', culture: 'Visitors are encouraged to respect local guides, protected landscapes, and Indigenous traditions.' },
  { name: 'Dawis Beach', location: 'Digos City', rating: '4.6', type: 'Nature', best: 'Dec – May', distance: '7.8 km', image: '/dawis-coast.png', position: 'center', description: 'A laid-back tropical shoreline for sunset walks, sea air, and quiet views of the coast.', history: 'Dawis reflects the city’s enduring connection to the Davao Gulf and coastal livelihoods.', culture: 'Simple seaside gatherings and community life give the area its relaxed local character.' },
];

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

function LightHeader({ title, back, onBack }: { title: string; back?: boolean; onBack?: () => void }) {
  return <header className="light-header">{back ? <button onClick={onBack} aria-label="Back"><ArrowLeft size={20} /></button> : <button aria-label="Menu"><Menu size={20} /></button>}<h1>{title}</h1><div className="mini-avatar">DR</div></header>;
}

function HomeScreen({ go, open }: { go: (s: Screen) => void; open: (d: Destination) => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Nature');
  return <div className="screen home-screen">
    <Photo spot={destinations[0]} className="home-backdrop">
      <div className="image-shade" />
      <div className="home-top"><GlassIcon label="Menu"><Menu size={19} /></GlassIcon><div className="home-location"><small>Current location</small><span><MapPin size={13} /> Digos City <b className="location-chevron"><ChevronDown size={13} /></b></span></div><div className="avatar-glass">DR</div></div>
      <div className="home-copy"><Logo inverse /><p>Explore Digos City</p><h1>Discover Digos<br /><em>Through AR</em></h1></div>
      <label className="glass-search"><Search size={19} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tourist spots..." /><button onClick={() => go('explore')} aria-label="Search"><ChevronRight size={18} /></button></label>
      <div className="home-categories">{['Nature', 'Adventure', 'Culture', 'History'].map((c, i) => { const Icon = [Leaf, Compass, Medal, History][i]; return <button className={category === c ? 'active' : ''} onClick={() => setCategory(c)} key={c}><Icon size={18} /><span>{c}</span></button>; })}</div>
      <div className="popular-head"><div><small>CURATED FOR YOU</small><h2>Popular Tourist Spots</h2></div><button onClick={() => go('explore')}>View all</button></div>
      <div className="popular-rail">{destinations.map((spot, i) => <button className="popular-card" key={spot.name} onClick={() => open(spot)}>
        <Photo spot={spot}><span className="card-count">0{i + 1}</span><span className="card-open"><ChevronRight size={20} /></span><div className="card-glass"><div><small>{spot.type}</small><h3>{spot.name}</h3><p><Footprints size={12} /> {spot.distance}</p></div><strong>+100 XP</strong></div></Photo>
      </button>)}</div>
    </Photo>
  </div>;
}

function ExploreScreen({ open }: { open: (d: Destination) => void }) {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const visible = useMemo(() => destinations.filter(d => (category === 'All' || d.type === category) && d.name.toLowerCase().includes(query.toLowerCase())), [category, query]);
  return <div className="screen explore-screen"><div className="dark-cap"><LightHeader title="Explore Digos" /><p>Every place holds a story.</p><div className="explore-search"><Search size={19} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tourist spots..." /><Filter size={18} /></div><div className="explore-chips">{['All', 'Nature', 'Adventure', 'Culture', 'History'].map(c => <button className={category === c ? 'active' : ''} onClick={() => setCategory(c)} key={c}>{c}</button>)}</div></div>
    <section className="visual-list"><div className="list-heading"><span>{visible.length} places</span><small>AR-ready guides</small></div>{visible.map(spot => <button className="visual-card" key={spot.name} onClick={() => open(spot)}><Photo spot={spot}><div className="image-shade" /><div className="visual-top"><span><Star size={12} fill="currentColor" /> {spot.rating}</span><i><ChevronRight size={19} /></i></div><div className="visual-copy"><small>{spot.type}</small><h2>{spot.name}</h2><p>{spot.description}</p><div><span><MapPin size={12} /> {spot.distance}</span><strong>+100 XP</strong></div></div></Photo></button>)}{!visible.length && <div className="empty"><Search size={28} /><h2>No places found</h2><p>Try another name or category.</p></div>}</section>
  </div>;
}

function DetailsScreen({ spot, go }: { spot: Destination; go: (s: Screen) => void }) {
  const [favorite, setFavorite] = useState(false);
  return <div className="screen detail-screen"><Photo spot={spot} className="detail-hero"><div className="image-shade" /><div className="detail-top"><GlassIcon label="Back" onClick={() => go('explore')}><ArrowLeft size={20} /></GlassIcon><div><GlassIcon label="Expand image"><Expand size={18} /></GlassIcon><GlassIcon label="Favorite" active={favorite} onClick={() => setFavorite(!favorite)}><Heart size={18} fill={favorite ? 'currentColor' : 'none'} /></GlassIcon></div></div><div className="detail-image-title"><small>{spot.type} · {spot.distance}</small><h1>{spot.name}</h1></div></Photo>
    <article className="info-sheet"><span className="sheet-handle" aria-hidden="true" /><div className="spot-meta"><p><MapPin size={13} /> {spot.location}</p><span>+100 XP</span></div><h1>{spot.name}</h1><div className="fact-row"><div><Leaf size={17} /><span><small>Category</small><strong>{spot.type}</strong></span></div><div><Clock3 size={17} /><span><small>Best time</small><strong>{spot.best}</strong></span></div><div><Footprints size={17} /><span><small>Distance</small><strong>{spot.distance}</strong></span></div></div>
      <section className="story"><small>ABOUT</small><h2>A place worth knowing</h2><div className="floating-actions"><button onClick={() => go('quest')}><Gamepad2 size={18} /> Quest</button><button onClick={() => go('navigation')}><Navigation size={18} fill="currentColor" /> Go</button></div><p>{spot.description}</p></section>
      <section className="story-columns"><div><History size={19} /><h3>History</h3><p>{spot.history}</p></div><div><Medal size={19} /><h3>Cultural significance</h3><p>{spot.culture}</p></div></section>
      <div className="media-preview"><Photo spot={spot}><PlayCircle size={34} /><span><small>MULTIMEDIA PREVIEW</small><strong>Watch the local story</strong></span></Photo><button onClick={() => go('model')}><Cube size={18} /> View 3D Model</button></div>
    </article>
  </div>;
}

function ARScreen({ spot, go, back }: { spot: Destination; go: (s: Screen) => void; back: () => void }) {
  const [recognized, setRecognized] = useState(true);
  return <div className="screen ar-screen"><Photo spot={spot} className="ar-camera"><div className="ar-shade" /><div className="ar-top"><GlassIcon label="Back" onClick={back}><ArrowLeft size={20} /></GlassIcon><div><small>AR PREVIEW</small><h1>{recognized ? 'Spot recognized' : 'Scanning...'}</h1></div><GlassIcon label="Flash"><Flashlight size={19} /></GlassIcon></div>
    <div className="scan-sweep" /><button className="recognition-point point-one" onClick={() => setRecognized(true)} aria-label="Recognition point"><i /></button><span className="recognition-point point-two"><i /></span><span className="recognition-point point-three"><i /></span>
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

function QuestScreen({ go }: { go: (s: Screen) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [wrong, setWrong] = useState(false);
  const answers = [['A', 'A historical church'], ['B', 'A highland with cool climate'], ['C', 'A white sand beach'], ['D', 'A commercial building']];
  if (complete) return <div className="screen quest-screen"><Photo spot={destinations[0]} className="quest-complete"><div className="image-shade" /><div className="reward-orbit"><Award size={42} /><i /></div><small>QUEST COMPLETE</small><h1>Trail knowledge<br />unlocked!</h1><div className="reward-total"><strong>+150 XP</strong><span>Badge unlocked · Highland Scout</span></div><button onClick={() => go('explore')}>Continue Exploring <ChevronRight size={18} /></button></Photo></div>;
  return <div className="screen quest-screen"><div className="quest-cover"><LightHeader title="Quest" /><div><span><Gamepad2 size={22} /></span><p><small>KAPATAGAN TRAIL</small><strong>Question 1 of 3</strong></p><b>+50 XP</b></div><Progress value={33} /></div><section className="quiz-card"><small>CHOOSE ONE ANSWER</small><h1>What is Kapatagan known for?</h1><div className="answers">{answers.map(([letter, text]) => <button key={letter} className={`${selected === letter ? 'selected' : ''} ${wrong && selected === letter ? 'wrong' : ''}`} onClick={() => { setSelected(letter); setWrong(false) }}><span>{letter}</span><p>{text}</p>{selected === letter && <CheckCircle2 size={19} />}</button>)}</div><button className="submit" disabled={!selected} onClick={() => selected === 'B' ? setComplete(true) : setWrong(true)}>{wrong ? 'Try another answer' : 'Submit Answer'} <ChevronRight size={18} /></button>{wrong && <p className="wrong-copy">Not quite—look for what makes the highlands special.</p>}<p className="xp-note"><Sparkles size={15} /> +50 XP for the correct answer</p></section></div>;
}

function AchievementsScreen({ back }: { back: () => void }) {
  const badges = [[Compass, 'First Explorer', 'First spot visited'], [Camera, 'AR Explorer', '3 AR scans'], [Trophy, 'Quiz Master', '10 quizzes'], [Medal, 'Digos Explorer', 'Level 4']];
  return <div className="screen achievements-screen"><LightHeader title="Achievements" back onBack={back} /><section className="xp-panel"><div className="award-halo"><Award size={34} /><span>4</span></div><small>DIGOS EXPLORER</small><h1>1,250 <span>Total XP</span></h1><div><p><span>Level 4</span><b>1,250 / 1,500 XP</b></p><Progress value={83} /></div></section><section className="badge-section"><header><div><small>COLLECTION</small><h2>Earned badges</h2></div><span>4 of 8</span></header><div className="badge-grid">{badges.map(([Icon, name, hint], i) => { const BadgeIcon = Icon as typeof Compass; return <div className={`badge badge-${i}`} key={name as string}><div><BadgeIcon size={25} /></div><strong>{name as string}</strong><small>{hint as string}</small></div> })}</div></section><section className="next-reward"><span><Gift size={24} /></span><div><small>NEXT REWARD</small><h3>Visit 6 more spots</h3><Progress value={40} /><p><span>4 visited</span><span>10 spots</span></p></div></section></div>;
}

function ProfileScreen({ go }: { go: (s: Screen) => void }) {
  const items = [[Award, 'My Achievements'], [Trophy, 'Quest Progress'], [History, 'History'], [Settings, 'Settings'], [Info, 'About DigosAR']];
  return <div className="screen profile-screen"><div className="profile-cover"><Photo spot={destinations[1]}><div className="image-shade" /><LightHeader title="Profile" /><div className="profile-identity"><div className="profile-avatar">DR<i><Leaf size={12} /></i></div><small>DIGOS EXPLORER</small><h1>Digos Explorer</h1><p>Level 4 · 1,250 XP</p></div></Photo></div><section className="profile-body"><div className="profile-stats"><div><strong>1,250</strong><span>XP</span></div><div><strong>5</strong><span>Spots</span></div><div><strong>12</strong><span>Quizzes</span></div><div><strong>4</strong><span>Badges</span></div></div><div className="progress-glass"><div><small>LEVEL PROGRESS</small><strong>250 XP to Level 5</strong></div><Progress value={83} /></div><div className="profile-menu">{items.map(([Icon, label], i) => { const ItemIcon = Icon as typeof Award; return <button key={label as string} onClick={i === 0 ? () => go('achievements') : undefined}><span><ItemIcon size={19} /></span><strong>{label as string}</strong><ChevronRight size={18} /></button> })}</div></section></div>;
}

function BottomNav({ active, go }: { active: Screen; go: (s: Screen) => void }) {
  return <nav className={`bottom-nav ${active === 'home' ? 'home-glass-nav' : ''}`} aria-label="Main navigation">{nav.map(({ screen, label, icon: Icon }) => <button key={screen} className={`${screen === 'ar' ? 'ar-nav' : ''} ${active === screen ? 'active' : ''}`} onClick={() => go(screen)}><span><Icon size={screen === 'ar' ? 25 : 20} /></span><small>{label}</small></button>)}</nav>;
}

export default function DigosAR() {
  const [screen, setScreen] = useState<Screen>('home');
  const [spot, setSpot] = useState(destinations[0]);
  const [previous, setPrevious] = useState<Screen>('home');
  const go = (next: Screen) => { setPrevious(screen); setScreen(next); document.querySelector('.app-content')?.scrollTo({ top: 0, behavior: 'smooth' }) };
  const open = (d: Destination) => { setSpot(d); go('details') };
  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController(); const allowed: Screen[] = ['home','explore','ar','quest','achievements','profile'];
    void Promise.resolve(context.registerTool({ name: 'open_digosar_screen', title: 'Open a DigosAR screen', description: 'Navigate to a main DigosAR prototype screen.', inputSchema: { type: 'object', properties: { screen: { type: 'string', enum: allowed } }, required: ['screen'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input: unknown) { const requested = (input as { screen?: Screen })?.screen; if (!requested || !allowed.includes(requested)) throw new Error('Unknown DigosAR screen.'); setScreen(requested); return { screen: requested, status: 'opened' } } }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);
  const active: Screen = screen === 'details' || screen === 'navigation' || screen === 'model' ? 'explore' : screen === 'achievements' ? 'profile' : screen;
  let content: React.ReactNode;
  if (screen === 'home') content = <HomeScreen go={go} open={open} />;
  else if (screen === 'explore') content = <ExploreScreen open={open} />;
  else if (screen === 'details') content = <DetailsScreen spot={spot} go={go} />;
  else if (screen === 'ar') content = <ARScreen spot={spot} go={go} back={() => setScreen(previous === 'ar' ? 'home' : previous)} />;
  else if (screen === 'navigation') content = <NavigationScreen spot={spot} go={go} />;
  else if (screen === 'model') content = <ModelScreen spot={spot} go={go} />;
  else if (screen === 'quest') content = <QuestScreen go={go} />;
  else if (screen === 'achievements') content = <AchievementsScreen back={() => go('profile')} />;
  else content = <ProfileScreen go={go} />;
  return <main className="site-shell"><div className="desktop-brand"><Logo inverse /><h1>A new layer<br />of Digos.</h1><p>Immersive tourism. Local stories.<br />One AR-ready companion.</p><span>STATIC EXPERIENCE · V2</span></div><div className="phone"><div className={`status-bar ${['home','ar','navigation'].includes(screen) ? 'light' : ''}`}><span>9:41</span><div><i /><i /><b /></div></div><div className="app-content">{content}</div><BottomNav active={active} go={go} /></div><div className="desktop-index"><span>01</span><i /><span>FOREST GLASS</span></div></main>;
}
