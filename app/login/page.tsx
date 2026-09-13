'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, AtSign, LockKeyhole, LogIn, UserRound } from 'lucide-react';
import Link from 'next/link';
import { ARLoader } from '@/components/ar-loader';
import { supabase } from '@/lib/supabase';
import { friendlyAuthError, isValidUsername, normalizeUsername, usernameToAuthEmail } from '@/lib/auth';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
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

  const submit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setErrorMessage('');
    setNotice('');
    const normalizedUsername = normalizeUsername(username);
    if (!isValidUsername(normalizedUsername)) {
      setErrorMessage('Username must be 3–20 characters and contain only letters, numbers, or underscores.');
      setBusy(false);
      return;
    }
    const authEmail = usernameToAuthEmail(normalizedUsername);

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: { display_name: displayName.trim() || 'Digos Explorer', username: normalizedUsername },
        },
      });
      if (error || data.user?.identities?.length === 0) setErrorMessage(error ? friendlyAuthError(error.message, 'signup') : 'That username is already taken.');
      else if (data.session) window.location.replace(`/?view=${destination()}`);
      else setNotice('Account created, but automatic sign-in is unavailable. Ask the administrator to disable email confirmation for this test setup.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
      if (error) setErrorMessage(friendlyAuthError(error.message, 'login'));
      else window.location.replace(`/?view=${destination()}`);
    }
    setBusy(false);
  };

  return <main className="login-page">
    <section className="login-visual" aria-label="Digos City landscape">
      <div className="login-visual-shade" />
      <Link className="login-back" href="/?view=explore" aria-label="Back to Explore"><ArrowLeft size={20} /></Link>
      <div className="login-story"><small>YOUR CITY. YOUR STORY.</small><h1>Explore Digos<br /><em>beyond the map.</em></h1><p>Save places, complete local quests, and keep every discovery connected to your account.</p></div>
    </section>
    <section className="login-panel">
      <div className="login-form-wrap">
        <span className="login-eyebrow">DIGOSAR ACCOUNT</span>
        <h2>{mode === 'login' ? 'Welcome back' : 'Join the journey'}</h2>
        <p>{mode === 'login' ? 'Log in to continue your quests and saved places.' : 'Create an account to save progress across Digos.'}</p>
        <form className="login-form" onSubmit={submit}>
          {mode === 'signup' && <label><span>Display name</span><div><UserRound size={19} /><input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Digos Explorer" /></div></label>}
          <label><span>Username</span><div><AtSign size={19} /><input required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" autoCapitalize="none" spellCheck={false} autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="your_username" /></div></label>
          <label><span>Password</span><div><LockKeyhole size={19} /><input required minLength={6} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /></div></label>
          {errorMessage && <p className="auth-error">{errorMessage}</p>}
          {notice && <p className="auth-notice">{notice}</p>}
          <button className="login-submit" disabled={busy}>{busy ? <ARLoader compact label={mode === 'login' ? 'Logging in…' : 'Creating account…'} /> : <><LogIn size={19} />{mode === 'login' ? 'Log in' : 'Create account'}</>}</button>
          <button type="button" className="login-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErrorMessage(''); setNotice(''); }}>{mode === 'login' ? 'New to DigosAR? Create an account' : 'Already have an account? Log in'}</button>
        </form>
      </div>
      {checkingSession && <div className="login-checking"><ARLoader label="Checking your account…" /></div>}
    </section>
  </main>;
}
