/**
 * agyService.ts — Phase 4
 *
 * Isolates all Tauri IPC calls for AGY integration.
 * Falls back to mock streaming responses when AGY is not installed,
 * so the UI always works regardless of backend availability.
 */

// We use dynamic import so the module can be loaded in a plain browser
// context (e.g. Vite dev without Tauri) without crashing.
type UnlistenFn = () => void;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgyCheckResult {
  installed: boolean;
  path?: string;
}

type TokenCallback = (token: string) => void;
type DoneCallback = (exitCode: number | null) => void;
type ErrorCallback = (message: string) => void;

// ── Mock data (fallback when AGY not installed) ───────────────────────────────

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
  mockReplyIndex++;
  return reply;
}

// ── Internal state ────────────────────────────────────────────────────────────

let tokenCb: TokenCallback | null = null;
let doneCb: DoneCallback | null = null;
let errorCb: ErrorCallback | null = null;

// Tauri event unlisteners — cleaned up when a new conversation starts
const unlisteners: UnlistenFn[] = [];

// Mock streaming handle
let mockHandle: ReturnType<typeof setTimeout> | null = null;
let mockCancelFlag = false;

// Whether we have successfully loaded @tauri-apps/api
let tauriApiAvailable: boolean | null = null;

// ── Tauri availability check ──────────────────────────────────────────────────

async function isTauriAvailable(): Promise<boolean> {
  if (tauriApiAvailable !== null) return tauriApiAvailable;
  try {
    // The window.__TAURI_INTERNALS__ object is injected by Tauri at runtime
    tauriApiAvailable =
      typeof window !== 'undefined' &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      !!(window as any).__TAURI_INTERNALS__;
  } catch {
    tauriApiAvailable = false;
  }
  return tauriApiAvailable;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Detect whether AGY is installed.
 * Returns {installed: false} when running outside Tauri.
 */
export async function detectAgy(): Promise<AgyCheckResult> {
  if (!(await isTauriAvailable())) {
    return { installed: false };
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<AgyCheckResult>('check_agy');
    return result;
  } catch (err) {
    console.warn('[agyService] check_agy failed:', err);
    return { installed: false };
  }
}

/** Register a callback for each streaming token. */
export function onToken(cb: TokenCallback): void {
  tokenCb = cb;
}

/** Register a callback for when generation finishes. */
export function onDone(cb: DoneCallback): void {
  doneCb = cb;
}

/** Register a callback for error events. */
export function onError(cb: ErrorCallback): void {
  errorCb = cb;
}

/**
 * Start a new conversation — spawns a fresh AGY process (or mock).
 * Registers Tauri event listeners and calls the stored callbacks.
 */
export async function startConversation(prompt: string): Promise<void> {
  // Tear down previous listeners
  _cleanupListeners();

  if (!(await isTauriAvailable())) {
    _runMock(prompt);
    return;
  }

  let agyInstalled = false;
  try {
    const result = await detectAgy();
    agyInstalled = result.installed;
  } catch {
    agyInstalled = false;
  }

  if (!agyInstalled) {
    _runMock(prompt);
    return;
  }

  // Real AGY path — register event listeners then invoke the command
  try {
    const { listen } = await import('@tauri-apps/api/event');
    const { invoke } = await import('@tauri-apps/api/core');

    const unToken = await listen<{ token: string }>('agy://token', (ev) => {
      tokenCb?.(ev.payload.token);
    });

    const unDone = await listen<{ exit_code: number | null }>('agy://done', (ev) => {
      doneCb?.(ev.payload.exit_code ?? null);
      _cleanupListeners();
    });

    const unError = await listen<{ message: string }>('agy://error', (ev) => {
      errorCb?.(ev.payload.message);
      _cleanupListeners();
    });

    unlisteners.push(unToken, unDone, unError);

    await invoke('send_to_agy', { prompt });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errorCb?.(msg);
    _cleanupListeners();
  }
}

/**
 * Cancel the current generation — kills the AGY process or stops the mock.
 */
export async function cancelGeneration(): Promise<void> {
  // Stop mock
  mockCancelFlag = true;
  if (mockHandle !== null) {
    clearTimeout(mockHandle);
    mockHandle = null;
  }

  if (!(await isTauriAvailable())) return;

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('cancel_agy');
  } catch (err) {
    console.warn('[agyService] cancel_agy failed:', err);
  }

  _cleanupListeners();
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _cleanupListeners(): void {
  for (const fn of unlisteners) {
    try { fn(); } catch { /* ignore */ }
  }
  unlisteners.length = 0;
}

/**
 * Simulate streaming by splitting a mock reply into tokens and
 * emitting them with a short delay between each.
 */
function _runMock(_prompt: string): void {
  mockCancelFlag = false;
  const reply = getNextMockReply();
  // Split into word-level tokens to simulate streaming
  const tokens = reply.split(/(?<=\s)|(?=\s)/g).filter(Boolean);
  let index = 0;

  const emitNext = () => {
    if (mockCancelFlag || index >= tokens.length) {
      if (!mockCancelFlag) {
        doneCb?.(0);
      }
      mockHandle = null;
      return;
    }
    tokenCb?.(tokens[index++]);
    mockHandle = setTimeout(emitNext, 25 + Math.random() * 30);
  };

  // Small initial delay to mimic "thinking"
  mockHandle = setTimeout(emitNext, 400);
}
