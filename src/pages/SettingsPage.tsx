/** SettingsPage — Production-ready settings shell */
import { useState } from 'react';
import './pages.css';

type SettingsSection = 'appearance' | 'editor' | 'terminal' | 'keybindings' | 'about';

interface SectionItem {
  id: SettingsSection;
  label: string;
  icon: string;
}

const SECTIONS: SectionItem[] = [
  { id: 'appearance',  label: 'Appearance',  icon: '🎨' },
  { id: 'editor',      label: 'Editor',      icon: '✏️' },
  { id: 'terminal',    label: 'Terminal',    icon: '⬛' },
  { id: 'keybindings', label: 'Keybindings', icon: '⌨️' },
  { id: 'about',       label: 'About',       icon: 'ℹ️' },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="settings-page__title">Settings</h1>
        <p className="settings-page__subtitle">Configure AGY Studio</p>
      </div>

      <div className="settings-page__body">
        {/* Left nav */}
        <nav className="settings-nav" aria-label="Settings sections">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={`settings-nav__item${activeSection === s.id ? ' settings-nav__item--active' : ''}`}
              onClick={() => setActiveSection(s.id)}
              aria-current={activeSection === s.id ? 'page' : undefined}
            >
              <span aria-hidden="true">{s.icon}</span>{' '}{s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="settings-content" role="region" aria-label={activeSection}>
          {activeSection === 'appearance' && <AppearanceSection />}
          {activeSection === 'editor'      && <EditorSection />}
          {activeSection === 'terminal'    && <TerminalSection />}
          {activeSection === 'keybindings' && <KeybindingsSection />}
          {activeSection === 'about'       && <AboutSection />}
        </div>
      </div>
    </div>
  );
}

/* ─── Section components ─────────────────────────────────────────────── */

function AppearanceSection() {
  return (
    <>
      <h2 className="settings-section__title">Appearance</h2>

      <div className="settings-row">
        <div>
          <div className="settings-row__label">Theme</div>
          <div className="settings-row__desc">Color scheme for the UI</div>
        </div>
        <span className="settings-row__value">Dark (default)</span>
      </div>

      <div className="settings-row">
        <div>
          <div className="settings-row__label">Font Family</div>
          <div className="settings-row__desc">UI font used throughout the app</div>
        </div>
        <span className="settings-row__value">System default</span>
      </div>

      <div className="settings-row">
        <div>
          <div className="settings-row__label">Font Size</div>
          <div className="settings-row__desc">Base font size in pixels</div>
        </div>
        <span className="settings-row__value">13px</span>
      </div>

      <div className="settings-row">
        <div>
          <div className="settings-row__label">Sidebar width</div>
          <div className="settings-row__desc">Width of the navigation sidebar</div>
        </div>
        <span className="settings-row__value">220px</span>
      </div>
    </>
  );
}

function EditorSection() {
  return (
    <>
      <h2 className="settings-section__title">Editor</h2>

      <div className="settings-row">
        <div>
          <div className="settings-row__label">Tab Size</div>
          <div className="settings-row__desc">Number of spaces per tab</div>
        </div>
        <span className="settings-row__value">2 spaces</span>
      </div>

      <div className="settings-row">
        <div>
          <div className="settings-row__label">Word Wrap</div>
          <div className="settings-row__desc">Wrap long lines in the editor</div>
        </div>
        <span className="settings-row__value">Off</span>
      </div>

      <div className="settings-row">
        <div>
          <div className="settings-row__label">Minimap</div>
          <div className="settings-row__desc">Show minimap on the right side</div>
        </div>
        <span className="settings-row__value">On</span>
      </div>

      <div className="settings-row">
        <div>
          <div className="settings-row__label">Auto Save</div>
          <div className="settings-row__desc">Automatically save files after a delay</div>
        </div>
        <span className="settings-row__value">After delay (1s)</span>
      </div>
    </>
  );
}

function TerminalSection() {
  return (
    <>
      <h2 className="settings-section__title">Terminal</h2>

      <div className="settings-row">
        <div>
          <div className="settings-row__label">Shell</div>
          <div className="settings-row__desc">Default shell executable</div>
        </div>
        <span className="settings-row__value">/bin/bash</span>
      </div>

      <div className="settings-row">
        <div>
          <div className="settings-row__label">Font Size</div>
          <div className="settings-row__desc">Terminal font size in pixels</div>
        </div>
        <span className="settings-row__value">13px</span>
      </div>

      <div className="settings-row">
        <div>
          <div className="settings-row__label">Scrollback</div>
          <div className="settings-row__desc">Number of lines to keep in scrollback buffer</div>
        </div>
        <span className="settings-row__value">10,000</span>
      </div>
    </>
  );
}

function KeybindingsSection() {
  return (
    <>
      <h2 className="settings-section__title">Keybindings</h2>

      {[
        ['Command Palette', 'Ctrl + Shift + P'],
        ['New Chat',        'Ctrl + N'],
        ['Toggle Sidebar',  'Ctrl + B'],
        ['Toggle Terminal', 'Ctrl + `'],
        ['Open Settings',   'Ctrl + ,'],
        ['Search Files',    'Ctrl + P'],
      ].map(([action, binding]) => (
        <div className="settings-row" key={action}>
          <div className="settings-row__label">{action}</div>
          <span className="settings-row__value">{binding}</span>
        </div>
      ))}
    </>
  );
}

function AboutSection() {
  return (
    <>
      <h2 className="settings-section__title">About</h2>

      {[
        ['Application', 'AGY Studio'],
        ['Version',     '0.1.0'],
        ['Platform',    'Linux'],
        ['Built with',  'Tauri v2 + React + TypeScript'],
        ['License',     'MIT'],
      ].map(([key, val]) => (
        <div className="settings-row" key={key}>
          <div className="settings-row__label">{key}</div>
          <span className="settings-row__value">{val}</span>
        </div>
      ))}
    </>
  );
}
