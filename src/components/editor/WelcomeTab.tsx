/** WelcomeTab — shown when no files are open in the editor */
import './WelcomeTab.css';

export default function WelcomeTab() {
  return (
    <div className="welcome-tab" role="main" aria-label="Welcome">
      <div className="welcome-tab__inner">
        <span className="welcome-tab__icon" aria-hidden="true">✏️</span>
        <h2 className="welcome-tab__title">AGY Studio Editor</h2>
        <p className="welcome-tab__sub">
          Open a file from the <strong>Files</strong> panel to start editing.
        </p>
        <ul className="welcome-tab__hints">
          <li><kbd>Ctrl</kbd>+<kbd>S</kbd> — Save file</li>
          <li><kbd>Ctrl</kbd>+<kbd>F</kbd> — Find in file</li>
          <li><kbd>Ctrl</kbd>+<kbd>H</kbd> — Find &amp; Replace</li>
        </ul>
      </div>
    </div>
  );
}
