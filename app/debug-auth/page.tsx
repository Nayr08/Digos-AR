'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DebugAuthPage() {
  const [status, setStatus] = useState('checking…');
  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => { if (active) setStatus('session request timed out'); }, 8000);
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setStatus(error ? `session error: ${error.message}` : `session loaded: ${data.session ? 'yes' : 'no'} · user id present: ${data.session?.user ? 'yes' : 'no'}`);
    }).catch(() => { if (active) setStatus('session request failed'); }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); };
  }, []);
  return <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#071A12', color: '#F5F7F3', textAlign: 'center' }}><section><h1>DigosAR Auth Debug</h1><p>{status}</p><p>Profile loading is handled by the main app after auth resolves.</p></section></main>;
}
