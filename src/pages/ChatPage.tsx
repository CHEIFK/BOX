/** ChatPage — Phase 4: connected to AGY via AgyContext / agyService */
import { useState, useCallback, useRef } from 'react';
import type { Conversation, Message } from '../components/chat/types';
import { MOCK_CONVERSATIONS } from '../components/chat/mockData';
import ConversationList from '../components/chat/ConversationList';
import MessageList from '../components/chat/MessageList';
import ChatInput from '../components/chat/ChatInput';
import EmptyState from '../components/chat/EmptyState';
import { useAgy } from '../contexts/AgyContext';
import './ChatPage.css';

function createId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function ChatPage() {
  const { startChat, cancelChat, isRunning } = useAgy();

  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeId, setActiveId] = useState<string | null>(MOCK_CONVERSATIONS[0].id);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ID of the assistant message currently being streamed into
  const streamingMsgId = useRef<string | null>(null);

  const activeConversation = conversations.find(c => c.id === activeId) ?? null;

  // ── Helpers ────────────────────────────────────────────────────────────────

  const appendToAssistantMessage = useCallback((msgId: string, token: string) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== activeId) return conv;
      return {
        ...conv,
        messages: conv.messages.map(m =>
          m.id === msgId ? { ...m, content: m.content + token } : m,
        ),
      };
    }));
  }, [activeId]);

  // ── Create new conversation ────────────────────────────────────────────────

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

  // ── Send message ───────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isRunning) return;

    const userMsg: Message = {
      id: createId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setInputValue('');
    setIsLoading(true);

    // Capture activeId in a local const so callbacks close over it
    const convId = activeId;

    // Add user message and (optimistically) prepare for the assistant bubble
    setConversations(prev => prev.map(conv => {
      if (conv.id !== convId) return conv;
      return {
        ...conv,
        messages: [...conv.messages, userMsg],
        lastMessage: text.slice(0, 80),
        updatedAt: new Date(),
        title: conv.title === 'New conversation'
          ? text.slice(0, 40) + (text.length > 40 ? '…' : '')
          : conv.title,
      };
    }));

    const assistantMsgId = createId();

    // Token callback — first token transitions loading→streaming
    const handleToken = (token: string) => {
      if (isLoading || streamingMsgId.current === null) {
        // First token: add the assistant bubble and stop loading spinner
        setIsLoading(false);
        streamingMsgId.current = assistantMsgId;

        const assistantMsg: Message = {
          id: assistantMsgId,
          role: 'assistant',
          content: token,
          timestamp: new Date(),
        };

        setConversations(prev => prev.map(conv => {
          if (conv.id !== convId) return conv;
          return {
            ...conv,
            messages: [...conv.messages, assistantMsg],
            lastMessage: token.slice(0, 80).replace(/[#`*\n]/g, ' '),
            updatedAt: new Date(),
          };
        }));
      } else {
        // Subsequent tokens: append to existing bubble
        appendToAssistantMessage(assistantMsgId, token);
      }
    };

    const handleDone = (_exitCode: number | null) => {
      setIsLoading(false);
      streamingMsgId.current = null;
      // Update lastMessage from the completed assistant content
      setConversations(prev => prev.map(conv => {
        if (conv.id !== convId) return conv;
        const last = conv.messages[conv.messages.length - 1];
        if (!last || last.role !== 'assistant') return conv;
        return {
          ...conv,
          lastMessage: last.content.slice(0, 80).replace(/[#`*\n]/g, ' '),
        };
      }));
    };

    const handleError = (msg: string) => {
      setIsLoading(false);
      streamingMsgId.current = null;

      const errorMsg: Message = {
        id: createId(),
        role: 'assistant',
        content: `⚠️ **Error:** ${msg}`,
        timestamp: new Date(),
      };

      setConversations(prev => prev.map(conv => {
        if (conv.id !== convId) return conv;
        return {
          ...conv,
          messages: [...conv.messages, errorMsg],
          lastMessage: `Error: ${msg.slice(0, 60)}`,
          updatedAt: new Date(),
        };
      }));
    };

    await startChat(text, handleToken, handleDone, handleError);
  }, [inputValue, isRunning, activeId, isLoading, startChat, appendToAssistantMessage]);

  // ── Stop streaming ─────────────────────────────────────────────────────────

  const handleStop = useCallback(async () => {
    await cancelChat();
    setIsLoading(false);
    streamingMsgId.current = null;
  }, [cancelChat]);

  // ── Select conversation ────────────────────────────────────────────────────

  const handleSelect = useCallback(async (id: string) => {
    setActiveId(id);
    setInputValue('');
    // Cancel any in-progress generation when switching conversations
    if (isRunning) {
      await cancelChat();
    }
    setIsLoading(false);
    streamingMsgId.current = null;
  }, [isRunning, cancelChat]);

  // ── Render ─────────────────────────────────────────────────────────────────

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
              isStreaming={isRunning}
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
