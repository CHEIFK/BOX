/** MessageBubble — renders a single chat message with markdown */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import type { Message } from './types';
import CodeBlock from './CodeBlock';
import './MessageBubble.css';

interface Props {
  message: Message;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/* react-markdown component overrides */
const markdownComponents: Components = {
  // Code blocks (fenced)
  code({ className, children, ...rest }) {
    const match = /language-(\w+)/.exec(className ?? '');
    const isBlock = 'node' in rest;
    const code = String(children).replace(/\n$/, '');

    if (match) {
      return <CodeBlock language={match[1]} code={code} />;
    }

    // Inline code — check if there's an explicit inline flag via node
    if (!isBlock || !match) {
      return <code className="msg-bubble__inline-code">{children}</code>;
    }

    return <CodeBlock language="" code={code} />;
  },
  // Tables
  table({ children }) {
    return (
      <div className="msg-bubble__table-wrap">
        <table className="msg-bubble__table">{children}</table>
      </div>
    );
  },
  // Blockquote
  blockquote({ children }) {
    return <blockquote className="msg-bubble__blockquote">{children}</blockquote>;
  },
};

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`msg-bubble${isUser ? ' msg-bubble--user' : ' msg-bubble--assistant'}`}>
      {/* Avatar */}
      <div className="msg-bubble__avatar" aria-hidden="true">
        {isUser ? (
          <svg viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 18c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ) : (
          <span className="msg-bubble__avatar-text">A</span>
        )}
      </div>

      {/* Content */}
      <div className="msg-bubble__content">
        <div className="msg-bubble__meta">
          <span className="msg-bubble__role">{isUser ? 'You' : 'AGY'}</span>
          <span className="msg-bubble__time">{formatTime(message.timestamp)}</span>
        </div>
        <div className="msg-bubble__body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
