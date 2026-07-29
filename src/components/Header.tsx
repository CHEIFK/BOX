/** Header — Top bar with breadcrumb and window drag region */
import { useLocation } from 'react-router-dom';
import './Header.css';

const ROUTE_LABELS: Record<string, string> = {
  '/chat':     'Chat',
  '/files':    'Files',
  '/editor':   'Editor',
  '/terminal': 'Terminal',
  '/settings': 'Settings',
};

export default function Header() {
  const { pathname } = useLocation();
  const pageLabel = ROUTE_LABELS[pathname] ?? 'AGY Studio';

  return (
    <header className="header" role="banner">
      <div className="header__breadcrumb">
        <span>AGY Studio</span>
        <span className="header__breadcrumb-sep" aria-hidden="true">›</span>
        <span className="header__breadcrumb-current">{pageLabel}</span>
      </div>

      <div className="header__actions" role="toolbar" aria-label="Header actions">
        {/* Placeholder action buttons — populated in later phases */}
        <button
          className="header__action-btn"
          aria-label="New conversation"
          title="New conversation"
        >
          ＋
        </button>
        <button
          className="header__action-btn"
          aria-label="Command palette"
          title="Command palette (⌘K)"
        >
          ⌘
        </button>
      </div>
    </header>
  );
}
