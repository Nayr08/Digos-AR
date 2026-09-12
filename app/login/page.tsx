'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, LockKeyhole, LogIn, Mail, UserRound } from 'lucide-react';
import Link from 'next/link';
import { ARLoader } from '@/components/ar-loader';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
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

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim() || 'Digos Explorer' },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (error) setErrorMessage(error.message);
      else if (data.session) window.location.replace(`/?view=${destination()}`);
      else setNotice('Account created. Check your email to confirm it, then return here to log in.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErrorMessage(error.message);
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
          <label><span>Email address</span><div><Mail size={19} /><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div></label>
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
