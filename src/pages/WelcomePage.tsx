/** WelcomePage — Phase 1 landing screen */
import './WelcomePage.css';

export default function WelcomePage() {
  return (
    <main className="welcome">
      <div className="welcome__glow" aria-hidden="true" />
      <div className="welcome__content">
        <h1 className="welcome__title">AGY Studio</h1>
        <p className="welcome__subtitle">Phase 1 — Foundation</p>
      </div>
    </main>
  );
}
