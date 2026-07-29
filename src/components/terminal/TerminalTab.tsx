/**
 * TerminalTab — a single tab in the terminal tab bar.
 */
import './TerminalTab.css';

interface TerminalTabProps {
  id: string;
  title: string;
  isActive: boolean;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
}

export default function TerminalTab({
  id,
  title,
  isActive,
  onActivate,
  onClose,
}: TerminalTabProps) {
  function handleClose(e: React.MouseEvent): void {
    e.stopPropagation();
    onClose(id);
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      onActivate(id);
    }
  }

  return (
    <div
      className={`terminal-tab${isActive ? ' terminal-tab--active' : ''}`}
      role="tab"
      aria-selected={isActive}
      aria-label={title}
      tabIndex={0}
      onClick={() => onActivate(id)}
      onKeyDown={handleKeyDown}
    >
      <span className="terminal-tab__icon" aria-hidden="true">
        ⬛
      </span>
      <span className="terminal-tab__title">{title}</span>
      <button
        className="terminal-tab__close"
        aria-label={`Close ${title}`}
        title={`Close ${title}`}
        onClick={handleClose}
        tabIndex={-1}
      >
        ×
      </button>
    </div>
  );
}
