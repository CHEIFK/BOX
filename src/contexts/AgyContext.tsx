/**
 * AgyContext.tsx — Phase 4
 *
 * React context that wraps agyService and exposes AGY state to the whole app.
 * Provides: isInstalled, isRunning, status, startChat, cancelChat
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  detectAgy,
  startConversation,
  cancelGeneration,
  onToken,
  onDone,
  onError,
} from '../services/agyService';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AgyStatus =
  | 'checking'
  | 'connected'   // AGY found and idle
  | 'running'     // AGY is generating a response
  | 'not_found'   // AGY not installed
  | 'error';      // Runtime error

export interface AgyContextValue {
  /** Whether the AGY binary was detected on the system. */
  isInstalled: boolean;
  /** Whether AGY is currently generating a response. */
  isRunning: boolean;
  /** Human-readable status for the StatusBar. */
  status: AgyStatus;
  /**
   * Send a prompt to AGY (or mock).
   * @param prompt  The user's message text.
   * @param onTokenReceived  Called with each streaming token.
   * @param onComplete  Called when the full response is done.
   * @param onFail  Called on error with the error message.
   */
  startChat: (
    prompt: string,
    onTokenReceived: (token: string) => void,
    onComplete: (exitCode: number | null) => void,
    onFail: (msg: string) => void,
  ) => Promise<void>;
  /** Cancel the current generation. */
  cancelChat: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AgyContext = createContext<AgyContextValue | null>(null);

export function AgyProvider({ children }: { children: ReactNode }) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<AgyStatus>('checking');

  // Check installation once on mount
  useEffect(() => {
    let cancelled = false;
    detectAgy().then((result) => {
      if (cancelled) return;
      setIsInstalled(result.installed);
      setStatus(result.installed ? 'connected' : 'not_found');
    });
    return () => { cancelled = true; };
  }, []);

  // We store the per-call callbacks in a ref so agyService event handlers
  // always call the latest version without needing to re-register.
  const tokenCbRef = useRef<((token: string) => void) | null>(null);
  const doneCbRef = useRef<((exitCode: number | null) => void) | null>(null);
  const errorCbRef = useRef<((msg: string) => void) | null>(null);

  // Register service callbacks once — they delegate to the latest refs
  useEffect(() => {
    onToken((token) => tokenCbRef.current?.(token));
    onDone((code) => {
      setIsRunning(false);
      setStatus(isInstalled ? 'connected' : 'not_found');
      doneCbRef.current?.(code);
    });
    onError((msg) => {
      setIsRunning(false);
      setStatus('error');
      errorCbRef.current?.(msg);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sync status when isInstalled changes (e.g. after initial check)
  useEffect(() => {
    if (!isRunning) {
      setStatus(isInstalled ? 'connected' : 'not_found');
    }
  }, [isInstalled, isRunning]);

  const startChat = useCallback(
    async (
      prompt: string,
      onTokenReceived: (token: string) => void,
      onComplete: (exitCode: number | null) => void,
      onFail: (msg: string) => void,
    ) => {
      // Point refs at this call's handlers
      tokenCbRef.current = onTokenReceived;
      doneCbRef.current = onComplete;
      errorCbRef.current = onFail;

      setIsRunning(true);
      setStatus('running');

      try {
        await startConversation(prompt);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setIsRunning(false);
        setStatus('error');
        onFail(msg);
      }
    },
    [],
  );

  const cancelChat = useCallback(async () => {
    await cancelGeneration();
    setIsRunning(false);
    setStatus(isInstalled ? 'connected' : 'not_found');
  }, [isInstalled]);

  return (
    <AgyContext.Provider value={{ isInstalled, isRunning, status, startChat, cancelChat }}>
      {children}
    </AgyContext.Provider>
  );
}

/** Access AGY context. Must be used inside <AgyProvider>. */
export function useAgy(): AgyContextValue {
  const ctx = useContext(AgyContext);
  if (!ctx) {
    throw new Error('useAgy must be used within an AgyProvider');
  }
  return ctx;
}
