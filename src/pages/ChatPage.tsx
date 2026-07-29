/** ChatPage — Phase 3 production Chat UI (no backend, mock data) */
import { useState, useCallback, useRef } from 'react';
import type { Conversation, Message } from '../components/chat/types';
import { MOCK_CONVERSATIONS } from '../components/chat/mockData';
import ConversationList from '../components/chat/ConversationList';
import MessageList from '../components/chat/MessageList';
import ChatInput from '../components/chat/ChatInput';
import EmptyState from '../components/chat/EmptyState';
import './ChatPage.css';

/* Simulate an assistant reply after a short delay */
const MOCK_REPLIES: string[] = [
  `That's a great question! Here's a quick overview:

\`\`\`typescript
// Example TypeScript snippet
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
\`\`\`

Let me know if you'd like more detail on any part of this.`,

  `Sure, I can help with that. The key thing to understand is the **lifecycle**:

1. Initialise state
2. Render the component
3. Commit to the DOM
4. Run effects

> **Note:** Effects run *after* the commit phase, not during render.`,

  `Here's a concise answer:

| Approach | Pros | Cons |
|----------|------|------|
| Option A | Fast, simple | Limited flexibility |
| Option B | Flexible | More complex |
| Option C | Best of both | Requires setup |

I'd generally recommend **Option B** for production use.`,
];

let mockReplyIndex = 0;
function getNextMockReply(): string {
  const reply = MOCK_REPLIES[mockReplyIndex % MOCK_REPLIES.length];
  mockReplyIndex += 1;
  return reply;
}

function createId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeId, setActiveId] = useState<string | null>(MOCK_CONVERSATIONS[0].id);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const streamingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeConversation = conversations.find(c => c.id === activeId) ?? null;

  /* ── Create new conversation ──────────────────────────────────────── */
  const handleNew = useCallback(() => {
    const newConv: Conversation = {
      id: createId(),
      title: 'New conversation',
      lastMessage: '',
      updatedAt: new Date(),
      messages: [],
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveId(newConv.id);
    setInputValue('');
  }, []);

  /* ── Send message ─────────────────────────────────────────────────── */
  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = {
      id: createId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setInputValue('');
    setIsLoading(true);

    setConversations(prev => prev.map(conv => {
      if (conv.id !== activeId) return conv;
      const updatedMessages = [...conv.messages, userMsg];
      return {
        ...conv,
        messages: updatedMessages,
        lastMessage: text.slice(0, 80),
        updatedAt: new Date(),
        // Update title from first user message if it's still the default
        title: conv.title === 'New conversation'
          ? text.slice(0, 40) + (text.length > 40 ? '…' : '')
          : conv.title,
      };
    }));

    // Mock streaming: show loading for 1.2s then show reply for 2s
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
      setIsStreaming(true);

      const reply = getNextMockReply();
      const assistantMsg: Message = {
        id: createId(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };

      setConversations(prev => prev.map(conv => {
        if (conv.id !== activeId) return conv;
        return {
          ...conv,
          messages: [...conv.messages, assistantMsg],
          lastMessage: reply.slice(0, 80).replace(/[#`*\n]/g, ' '),
          updatedAt: new Date(),
        };
      }));

      // Streaming "finishes" after 2s
      streamingTimerRef.current = setTimeout(() => {
        setIsStreaming(false);
      }, 2000);
    }, 1200);

    // Cleanup on unmount — store in ref
    streamingTimerRef.current = loadingTimer;
  }, [inputValue, isStreaming, activeId]);

  /* ── Stop streaming ───────────────────────────────────────────────── */
  const handleStop = useCallback(() => {
    if (streamingTimerRef.current) {
      clearTimeout(streamingTimerRef.current);
    }
    setIsStreaming(false);
    setIsLoading(false);
  }, []);

  /* ── Select conversation ──────────────────────────────────────────── */
  const handleSelect = useCallback((id: string) => {
    setActiveId(id);
    setInputValue('');
    // Stop any ongoing mock stream when switching
    if (streamingTimerRef.current) {
      clearTimeout(streamingTimerRef.current);
    }
    setIsStreaming(false);
    setIsLoading(false);
  }, []);

  return (
    <div className="chat-page">
      {/* Left panel — conversation list */}
      <ConversationList
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelect}
        onNew={handleNew}
      />

      {/* Right panel — active conversation or empty state */}
      <div className="chat-page__main">
        {activeConversation ? (
          <>
            {/* Conversation header */}
            <div className="chat-page__conv-header">
              <span className="chat-page__conv-title">{activeConversation.title}</span>
              <span className="chat-page__conv-count">
                {activeConversation.messages.length} message{activeConversation.messages.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Messages */}
            <MessageList
              messages={activeConversation.messages}
              isLoading={isLoading}
            />

            {/* Input */}
            <ChatInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSend}
              onStop={handleStop}
              isStreaming={isStreaming}
              disabled={false}
            />
          </>
        ) : (
          <EmptyState onNew={handleNew} />
        )}
      </div>
    </div>
  );
}
