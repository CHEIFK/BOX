/** ChatInput — multiline textarea with send/stop buttons */
import { useRef, useCallback } from 'react';
import type { KeyboardEvent, ChangeEvent } from 'react';
import './ChatInput.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export default function ChatInput({ value, onChange, onSend, onStop, isStreaming, disabled }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim().length > 0 && !isStreaming) {
        onSend();
      }
    }
  }, [disabled, value, isStreaming, onSend]);

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    // Auto-resize
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }, [onChange]);

  const canSend = value.trim().length > 0 && !isStreaming && !disabled;

  return (
    <div className="chat-input">
      <div className="chat-input__wrap">
        <textarea
          ref={textareaRef}
          className="chat-input__textarea"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask AGY anything… (Enter to send, Shift+Enter for newline)"
          rows={1}
          aria-label="Message input"
          disabled={disabled || isStreaming}
        />

        <div className="chat-input__actions">
          {isStreaming ? (
            <button
              className="chat-input__stop-btn"
              onClick={onStop}
              aria-label="Stop generation"
              title="Stop generation"
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor" />
              </svg>
              Stop
            </button>
          ) : (
            <button
              className={`chat-input__send-btn${canSend ? '' : ' chat-input__send-btn--disabled'}`}
              onClick={canSend ? onSend : undefined}
              disabled={!canSend}
              aria-label="Send message"
              title="Send message"
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M13.5 8L2 2.5l2.5 5.5L2 13.5 13.5 8z" fill="currentColor" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <p className="chat-input__hint">
        <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for newline
      </p>
    </div>
  );
}
