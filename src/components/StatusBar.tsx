/** StatusBar — Bottom status strip (Phase 4: shows live AGY status) */
import { useAgy, type AgyStatus } from '../contexts/AgyContext';
import './StatusBar.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

interface StatusMeta {
  label: string;
  modifier: string; // BEM modifier for the dot colour
}

function getStatusMeta(status: AgyStatus, isRunning: boolean): StatusMeta {
  if (isRunning) {
    return { label: 'AGY: Running…', modifier: 'statusbar__dot--running' };
  }
  switch (status) {
    case 'checking':
      return { label: 'AGY: Checking…', modifier: 'statusbar__dot--checking' };
    case 'connected':
      return { label: 'AGY: Connected', modifier: 'statusbar__dot--connected' };
    case 'not_found':
      return { label: 'AGY: Not found', modifier: 'statusbar__dot--error' };
    case 'error':
      return { label: 'AGY: Error', modifier: 'statusbar__dot--error' };
    case 'running':
      return { label: 'AGY: Running…', modifier: 'statusbar__dot--running' };
    default:
      return { label: 'AGY: Unknown', modifier: '' };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StatusBar() {
  const { status, isRunning } = useAgy();
  const { label, modifier } = getStatusMeta(status, isRunning);

  return (
    <footer className="statusbar" role="contentinfo" aria-label="Status bar">
      <div className="statusbar__left">
        <span className="statusbar__item">
          <span className={`statusbar__dot ${modifier}`} aria-hidden="true" />
          {label}
        </span>
        <span className="statusbar__divider" aria-hidden="true" />
        <span className="statusbar__item">No project open</span>
      </div>

      <div className="statusbar__right">
        <span className="statusbar__item">Linux</span>
        <span className="statusbar__divider" aria-hidden="true" />
        <span className="statusbar__item">v0.1.0</span>
      </div>
    </footer>
  );
}
