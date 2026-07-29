/** StatusBar — Bottom status strip */
import './StatusBar.css';

export default function StatusBar() {
  return (
    <footer className="statusbar" role="contentinfo" aria-label="Status bar">
      <div className="statusbar__left">
        <span className="statusbar__item">
          <span className="statusbar__dot" aria-hidden="true" />
          AGY: Not connected
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
