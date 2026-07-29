/** ConversationList — left panel listing all conversations */
import type { Conversation } from './types';
import './ConversationList.css';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ConversationList({ conversations, activeId, onSelect, onNew }: Props) {
  return (
    <aside className="conv-list" aria-label="Conversations">
      <div className="conv-list__header">
        <span className="conv-list__title">Conversations</span>
        <button
          className="conv-list__new-btn"
          onClick={onNew}
          title="New conversation"
          aria-label="New conversation"
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <ul className="conv-list__list" role="listbox" aria-label="Conversation list">
        {conversations.map(conv => (
          <li key={conv.id} role="option" aria-selected={conv.id === activeId}>
            <button
              className={`conv-list__item${conv.id === activeId ? ' conv-list__item--active' : ''}`}
              onClick={() => onSelect(conv.id)}
            >
              <div className="conv-list__item-icon" aria-hidden="true">💬</div>
              <div className="conv-list__item-body">
                <div className="conv-list__item-header">
                  <span className="conv-list__item-title">{conv.title}</span>
                  <span className="conv-list__item-time">{formatTimestamp(conv.updatedAt)}</span>
                </div>
                <span className="conv-list__item-preview">{conv.lastMessage}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
