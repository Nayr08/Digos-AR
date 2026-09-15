'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="error-screen">
      <section>
        <small>DIGOSAR</small>
        <h1>Unable to load DigosAR.</h1>
        <p>Please try loading this screen again.</p>
        <button type="button" onClick={() => reset()}>Try again</button>
      </section>
    </main>
  );
}
