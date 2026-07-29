/** EmptyState — shown when no conversation is selected */
import './EmptyState.css';

interface Props {
  onNew: () => void;
}

const SUGGESTIONS = [
  'Explain async/await in Rust',
  'Write a React hook for debouncing',
  'Optimise a slow SQL query',
  'How does tokio::select! work?',
];

export default function EmptyState({ onNew }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">✦</div>
      <h2 className="empty-state__heading">AGY Studio</h2>
      <p className="empty-state__sub">
        Your AI development assistant. Select a conversation or start a new one.
      </p>

      <button className="empty-state__new-btn" onClick={onNew}>
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        New conversation
      </button>

      <div className="empty-state__suggestions" aria-label="Suggested prompts">
        <p className="empty-state__suggestions-label">Try asking about…</p>
        <div className="empty-state__chips">
          {SUGGESTIONS.map(s => (
            <button key={s} className="empty-state__chip" onClick={onNew} aria-label={`Start conversation: ${s}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
