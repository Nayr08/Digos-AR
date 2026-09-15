'use client';

export default function DebugMobilePage() {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#071A12', color: '#F5F7F3', textAlign: 'center' }}>
      <section>
        <h1>DigosAR Mobile Debug OK</h1>
        <p>Basic rendering and LAN routing are working.</p>
        <img src="/ar/targets/dawis-ar-target.webp" alt="Static asset test" width={160} height={90} />
      </section>
    </main>
  );
}
