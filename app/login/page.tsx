'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, AtSign, CheckCircle2, Eye, EyeOff, LockKeyhole, LogIn } from 'lucide-react';
import Link from 'next/link';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { supabase } from '@/lib/supabase';
import { friendlyAuthError, isValidUsername, normalizeUsername, usernameToAuthEmail } from '@/lib/auth';

type AuthMode = 'login' | 'signup';
type SignupStep = 0 | 1 | 2;

const signupCopy = [
  { eyebrow: 'WELCOME TO DIGOSAR', title: 'Start your route.', body: 'Find places. Scan stories. Collect memories.', guide: 'Your local guide is ready.', mascot: '/mascot/mascot-excited.webp' },
  { eyebrow: '', title: 'What should we call you?', body: 'This name appears on your explorer profile.', guide: 'Nice to meet you.', mascot: '/mascot/mascot-wink.webp' },
  { eyebrow: '', title: 'Create your password.', body: 'Use at least 6 characters.', guide: 'Keep your progress safe.', mascot: '/mascot/mascot-thinking-idle.webp' },
] as const;

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [signupStep, setSignupStep] = useState<SignupStep>(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [signupComplete, setSignupComplete] = useState(false);

  const destination = () => {
    const requested = new URLSearchParams(window.location.search).get('next');
    return ['home', 'explore', 'quest', 'profile', 'navigation'].includes(requested ?? '') ? requested : 'home';
  };

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) window.location.replace(`/?view=${destination()}`);
    }).finally(() => { if (active) setCheckingSession(false); });
    return () => { active = false; };
  }, []);

  const currentSignup = useMemo(() => signupCopy[signupStep], [signupStep]);
  const normalizedUsername = normalizeUsername(username);

  const showLogin = () => {
    setMode('login');
    setSignupStep(0);
    setSignupComplete(false);
    setErrorMessage('');
    setNotice('');
    setPassword('');
    setPasswordVisible(false);
  };

  const startSignup = () => {
    setMode('signup');
    setSignupStep(0);
    setSignupComplete(false);
    setErrorMessage('');
    setNotice('');
    setPassword('');
    setPasswordVisible(false);
  };

  const validateUsername = () => {
    if (!isValidUsername(normalizedUsername)) {
      setErrorMessage('Use 3–20 characters with only letters, numbers, or underscores.');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const submit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setNotice('');

    if (mode === 'signup' && signupStep === 0) {
      setSignupStep(1);
      return;
    }
    if (mode === 'signup' && signupStep === 1) {
      if (validateUsername()) setSignupStep(2);
      return;
    }

    if (!validateUsername()) return;
    if (password.length < 6) {
      setErrorMessage('Password must contain at least 6 characters.');
      return;
    }

    setBusy(true);
    const authEmail = usernameToAuthEmail(normalizedUsername);
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: { display_name: normalizedUsername, username: normalizedUsername },
        },
      });
      if (error || data.user?.identities?.length === 0) {
        setErrorMessage(error ? friendlyAuthError(error.message, 'signup') : 'That explorer name is already taken.');
      } else if (data.session) {
        window.location.replace(`/?view=${destination()}`);
      } else {
        setSignupComplete(true);
        setNotice('Your account was created. Check your email if confirmation is enabled, then log in to continue.');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
      if (error) setErrorMessage(friendlyAuthError(error.message, 'login'));
      else window.location.replace(`/?view=${destination()}`);
    }
    setBusy(false);
  };

  return <main className={`login-page ${mode === 'signup' ? 'is-onboarding' : ''}`}>
    <section className="login-visual" aria-label="Digos City landscape">
      <div className="login-visual-shade" />
      <Link className="login-back" href="/?view=explore" aria-label="Back to Explore"><ArrowLeft size={20} /></Link>
      <div className="login-story"><small>YOUR CITY. YOUR STORY.</small><h1>Explore Digos<br /><em>beyond the map.</em></h1><p>Save places, complete local quests, and keep every discovery connected to your account.</p></div>
    </section>
    <section className="login-panel">
      <div className="login-form-wrap">
        {mode === 'signup' ? <>
          <div className="login-onboarding-topline">
            <div className="login-onboarding-wordmark"><span aria-hidden="true" /><strong>DIGOSAR</strong><small>FIELD GUIDE</small></div>
            <span className="login-step-count">{String(signupStep + 1).padStart(2, '0')} <i>/ 03</i></span>
          </div>
          <div className="login-step-progress" aria-label={`Sign-up step ${signupStep + 1} of 3`}>{signupCopy.map((_, index) => <i className={index <= signupStep ? 'is-active' : ''} key={index} />)}</div>
          <div key={`signup-mascot-${signupStep}`} className={`login-mascot-card ${signupStep === 0 ? 'is-welcome' : ''}`}>
            {/* Local mascot art keeps the onboarding fast and works offline after the app loads. */}
            {/* oxlint-disable-next-line next/no-img-element */}
            <img src={currentSignup.mascot} alt="DigosAR guide mascot" />
            <div>{currentSignup.eyebrow && <small>{currentSignup.eyebrow}</small>}<strong>{currentSignup.guide}</strong></div>
          </div>
          {signupComplete ? <div className="login-onboarding-success"><CheckCircle2 size={29} /><small>ACCOUNT READY</small><h2>Welcome, @{normalizedUsername}!</h2><p>Your explorer profile is ready. Log in to start the DigosAR route.</p>{notice && <p className="auth-notice">{notice}</p>}<button className="login-submit" type="button" onClick={showLogin}><LogIn size={18} /> Go to login</button></div> : <form key={`signup-form-${signupStep}`} className="login-form login-onboarding-form" onSubmit={submit}>
            <span className="login-eyebrow">EXPLORER PASSPORT</span>
            <h2>{currentSignup.title}</h2>
            <p>{signupStep === 0 ? currentSignup.body : signupStep === 1 ? 'This is how your guide will greet you on your journey.' : 'Use at least 6 characters so your progress stays private.'}</p>
            {signupStep === 1 && <label><span>Explorer username</span><div><AtSign size={19} /><input required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" autoCapitalize="none" spellCheck={false} autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="your_username" /></div></label>}
            {signupStep === 2 && <label><span>Password</span><div><LockKeyhole size={19} /><input required minLength={6} type={passwordVisible ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /><button className="login-password-toggle" type="button" aria-label={passwordVisible ? 'Hide password' : 'Show password'} onClick={() => setPasswordVisible((visible) => !visible)}>{passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>}
            {errorMessage && <p className="auth-error">{errorMessage}</p>}
            {notice && <p className="auth-notice">{notice}</p>}
            <div className="login-onboarding-actions"><button className="login-submit" disabled={busy}>{busy ? <LoadingSkeleton variant="button" label="Creating account…" /> : <>{signupStep === 0 ? <>Start exploring <ArrowRight size={18} /></> : signupStep === 1 ? <>Continue <ArrowRight size={18} /></> : <>Create my account</>}</>}</button>{signupStep > 0 && <button className="login-step-back" type="button" onClick={() => { setErrorMessage(''); setSignupStep((step) => (step - 1) as SignupStep); }}>Back</button>}</div>
          </form>}
          {signupStep === 0 && <button type="button" className="login-switch login-existing-account" onClick={showLogin}>Already have an account? Log in</button>}
        </> : <>
          <div className="login-mascot-card login-login-mascot">
            {/* oxlint-disable-next-line next/no-img-element */}
            <img src="/mascot/mascot-wink.webp" alt="DigosAR guide mascot waving" />
            <div><small>YOUR DIGOS GUIDE</small><strong>Welcome back, explorer.</strong><span>Pick up where your next story begins.</span></div>
          </div>
          <span className="login-eyebrow">DIGOSAR ACCOUNT</span>
          <h2>Welcome back</h2>
          <p>Log in to continue your quests and saved discoveries.</p>
          <form className="login-form" onSubmit={submit}>
            <label><span>Username</span><div><AtSign size={19} /><input required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" autoCapitalize="none" spellCheck={false} autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="your_username" /></div></label>
            <label><span>Password</span><div><LockKeyhole size={19} /><input required minLength={6} type={passwordVisible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /><button className="login-password-toggle" type="button" aria-label={passwordVisible ? 'Hide password' : 'Show password'} onClick={() => setPasswordVisible((visible) => !visible)}>{passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            {errorMessage && <p className="auth-error">{errorMessage}</p>}
            {notice && <p className="auth-notice">{notice}</p>}
            <button className="login-submit" disabled={busy}>{busy ? <LoadingSkeleton variant="button" label="Logging in…" /> : <><LogIn size={19} /> Log in</>}</button>
          </form>
          <button type="button" className="login-switch" onClick={startSignup}>New to DigosAR? Begin your journey</button>
        </>}
      </div>
      {checkingSession && <div className="login-checking"><LoadingSkeleton variant="auth" label="Checking your account…" /></div>}
    </section>
  </main>;
}
