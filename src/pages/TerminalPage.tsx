/**
 * TerminalPage — Phase 7 integrated terminal.
 *
 * Hosts up to 5 independent xterm.js terminal tabs. Each tab runs its own
 * /bin/bash shell via Tauri (or the mock simulator outside Tauri).
 *
 * Working-directory sync: new terminals open in the active workspace folder
 * (read from localStorage key agyStudio.activeWorkspacePath).
 */
import { useEffect, useCallback } from 'react';
import { useTerminals } from '../hooks/useTerminals';
import TerminalTabs from '../components/terminal/TerminalTabs';
import XTerminal from '../components/terminal/XTerminal';
import './TerminalPage.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

const WORKSPACE_LS_KEY = 'agyStudio.recentProjects';

/** Return the most-recently-opened workspace path from localStorage, or ''. */
function getWorkspaceCwd(): string {
  try {
    const raw = localStorage.getItem(WORKSPACE_LS_KEY);
    if (!raw) return '';
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
      return parsed[0];
    }
  } catch {
    // Ignore
  }
  return '';
}

// ── Component ─────────────────────────────────────────────────────────────────

const MAX_TERMINALS = 5;

export default function TerminalPage() {
  const cwd = getWorkspaceCwd();

  const {
    terminals,
    activeId,
    addTerminal,
    removeTerminal,
    setActiveId,
  } = useTerminals(cwd);

  // Open a first terminal automatically when the page mounts
  useEffect(() => {
    addTerminal(cwd || undefined);
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = useCallback(() => {
    addTerminal(getWorkspaceCwd() || undefined);
  }, [addTerminal]);

  return (
    <div className="terminal-page" aria-label="Integrated terminal">
      <TerminalTabs
        terminals={terminals}
        activeId={activeId}
        onActivate={setActiveId}
        onClose={removeTerminal}
        onAdd={handleAdd}
        maxReached={terminals.length >= MAX_TERMINALS}
      />

      <div className="terminal-page__body">
        {terminals.length === 0 ? (
          <div className="terminal-page__empty">
            <span className="terminal-page__empty-icon" aria-hidden="true">
              ⬛
            </span>
            <p>No terminal open.</p>
            <button
              className="terminal-page__new-btn"
              onClick={handleAdd}
              aria-label="Open new terminal"
            >
              + New Terminal
            </button>
          </div>
        ) : (
          terminals.map((t) => (
            <div
              key={t.id}
              className={`terminal-page__panel${t.id === activeId ? ' terminal-page__panel--active' : ''}`}
              role="tabpanel"
              aria-label={t.title}
              aria-hidden={t.id !== activeId}
            >
              <XTerminal
                id={t.id}
                cwd={t.cwd}
                isActive={t.id === activeId}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
