/**
 * FILE: frontend/src/App.tsx
 * PHASE: 7 - Frontend Foundation
 * PURPOSE: Composes providers (QueryClientProvider, AuthProvider, Toaster, Router).
 */

export default function App(): JSX.Element {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#0b1020',
        color: '#e2e8f0',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.7 }}>
          ReachInbox
        </p>
        <h1 style={{ margin: '0.75rem 0', fontSize: 'clamp(2rem, 5vw, 4rem)' }}>Scheduler shell</h1>
        <p style={{ margin: 0, opacity: 0.7 }}>Phase 0 foundation is live.</p>
      </div>
    </main>
  );
}
