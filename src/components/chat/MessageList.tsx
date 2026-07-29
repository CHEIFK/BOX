/** MessageList — scrollable message area with auto-scroll behavior */
import { useRef, useEffect, useCallback, useState } from 'react';
import type { Message } from './types';
import MessageBubble from './MessageBubble';
import LoadingDots from './LoadingDots';
import './MessageList.css';

interface Props {
  messages: Message[];
  isLoading: boolean;
}

export default function MessageList({ messages, isLoading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  // Detect if user manually scrolled up
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setUserScrolledUp(distanceFromBottom > 80);
  }, []);

  // Auto-scroll on new messages/loading unless user scrolled up
  useEffect(() => {
    if (!userScrolledUp) {
      scrollToBottom(messages.length > 0);
    }
  }, [messages, isLoading, userScrolledUp, scrollToBottom]);

  // Jump to bottom button handler
  const jumpToBottom = useCallback(() => {
    setUserScrolledUp(false);
    scrollToBottom(true);
  }, [scrollToBottom]);

  return (
    <div className="msg-list__wrapper">
      <div
        ref={containerRef}
        className="msg-list"
        onScroll={handleScroll}
        aria-label="Conversation messages"
        aria-live="polite"
        aria-relevant="additions"
      >
        <div className="msg-list__inner">
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && <LoadingDots />}
          <div ref={bottomRef} className="msg-list__sentinel" aria-hidden="true" />
        </div>
      </div>

      {userScrolledUp && (
        <button
          className="msg-list__jump-btn"
          onClick={jumpToBottom}
          aria-label="Jump to latest message"
          title="Jump to latest message"
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
