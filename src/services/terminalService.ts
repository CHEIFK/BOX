/**
 * terminalService — wraps Tauri invoke calls for the embedded terminal.
 *
 * When running outside Tauri (browser dev), it falls back to a simulated
 * bash-like environment so the UI remains functional.
 */

// ── Tauri detection ───────────────────────────────────────────────────────────

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type OutputHandler = (data: string) => void;
export type ExitHandler = () => void;

// ── Mock terminal ─────────────────────────────────────────────────────────────

const MOCK_CWD_DEFAULT = '/home/user/workspace';

class MockTerminal {
  private cwd: string;
  private outputHandler: OutputHandler | null = null;
  private exitHandler: ExitHandler | null = null;
  private inputBuffer = '';
  private history: string[] = [];

  constructor(cwd: string) {
    this.cwd = cwd || MOCK_CWD_DEFAULT;
  }

  onOutput(handler: OutputHandler): void {
    this.outputHandler = handler;
  }

  onExit(handler: ExitHandler): void {
    this.exitHandler = handler;
  }

  start(): void {
    this.emit(`\x1b[1;32mbash\x1b[0m -- mock terminal (no Tauri)\r\n`);
    this.emit(`Working directory: \x1b[1;34m${this.cwd}\x1b[0m\r\n\r\n`);
    this.prompt();
  }

  write(data: string): void {
    // Handle control sequences
    for (const char of data) {
      const code = char.charCodeAt(0);

      if (code === 13 || code === 10) {
        // Enter
        this.emit('\r\n');
        this.execute(this.inputBuffer.trim());
        this.inputBuffer = '';
      } else if (code === 127 || code === 8) {
        // Backspace
        if (this.inputBuffer.length > 0) {
          this.inputBuffer = this.inputBuffer.slice(0, -1);
          this.emit('\b \b');
        }
      } else if (code === 3) {
        // Ctrl+C
        this.emit('^C\r\n');
        this.inputBuffer = '';
        this.prompt();
      } else if (code >= 32) {
        this.inputBuffer += char;
        this.emit(char);
      }
    }
  }

  private prompt(): void {
    const cwd = this.cwd.replace(/^\/home\/[^/]+/, '~');
    this.emit(`\x1b[1;32muser@agyStudio\x1b[0m:\x1b[1;34m${cwd}\x1b[0m$ `);
  }

  private execute(cmd: string): void {
    if (!cmd) {
      this.prompt();
      return;
    }
    this.history.push(cmd);

    const parts = cmd.split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    switch (command) {
      case 'pwd':
        this.emit(`${this.cwd}\r\n`);
        break;

      case 'ls': {
        const files = [
          'README.md',
          'package.json',
          'tsconfig.json',
          'src/',
          'node_modules/',
          '.gitignore',
        ];
        this.emit(files.join('  ') + '\r\n');
        break;
      }

      case 'echo':
        this.emit(args.join(' ') + '\r\n');
        break;

      case 'date':
        this.emit(new Date().toString() + '\r\n');
        break;

      case 'clear':
        this.emit('\x1b[2J\x1b[H');
        break;

      case 'cd': {
        const target = args[0];
        if (!target || target === '~') {
          this.cwd = MOCK_CWD_DEFAULT;
        } else if (target.startsWith('/')) {
          this.cwd = target;
        } else {
          this.cwd = `${this.cwd}/${target}`.replace(/\/\.\//g, '/');
        }
        break;
      }

      case 'history':
        this.history.forEach((h, i) => {
          this.emit(`  ${String(i + 1).padStart(3)}  ${h}\r\n`);
        });
        break;

      case 'exit':
        this.emit('\r\nSession ended.\r\n');
        this.exitHandler?.();
        return;

      case 'help':
        this.emit(
          '\x1b[1mAvailable mock commands:\x1b[0m pwd, ls, echo, date, clear, cd, history, help, exit\r\n',
        );
        break;

      default:
        this.emit(
          `\x1b[31mbash: ${command}: command not found\x1b[0m\r\n` +
            `\x1b[2m(This is a mock terminal. Real shell available when running inside Tauri.)\x1b[0m\r\n`,
        );
    }

    this.prompt();
  }

  private emit(data: string): void {
    this.outputHandler?.(data);
  }

  destroy(): void {
    this.outputHandler = null;
    this.exitHandler = null;
  }
}

// ── Mock registry ─────────────────────────────────────────────────────────────

const mockTerminals = new Map<string, MockTerminal>();

// ── Tauri listener cleanup ────────────────────────────────────────────────────

type UnlistenFn = () => void;
const tauriListeners = new Map<string, UnlistenFn[]>();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Spawn a shell for the given terminal ID.
 * `onOutput` is called with raw data chunks from the shell.
 * `onExit` is called when the shell process exits.
 */
export async function spawnShell(
  id: string,
  cwd: string,
  onOutput: OutputHandler,
  onExit: ExitHandler,
): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    const { listen } = await import('@tauri-apps/api/event');

    // Clean up any previous listeners for this id
    const prev = tauriListeners.get(id);
    if (prev) {
      prev.forEach((fn) => fn());
      tauriListeners.delete(id);
    }

    const outputEvent = `terminal://output/${id}`;
    const exitEvent = `terminal://exit/${id}`;

    const unlistenOutput = await listen<{ data: string }>(outputEvent, (ev) => {
      onOutput(ev.payload.data);
    });

    const unlistenExit = await listen<unknown>(exitEvent, () => {
      onExit();
    });

    tauriListeners.set(id, [unlistenOutput, unlistenExit]);

    await invoke('spawn_shell', { id, cwd });
  } else {
    // Mock fallback
    const mock = new MockTerminal(cwd);
    mock.onOutput(onOutput);
    mock.onExit(onExit);
    mockTerminals.set(id, mock);
    mock.start();
  }
}

/**
 * Send keyboard input to the shell.
 */
export async function writeToTerminal(id: string, data: string): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('write_to_terminal', { id, data });
  } else {
    mockTerminals.get(id)?.write(data);
  }
}

/**
 * Notify the backend of a terminal resize (cols × rows).
 */
export async function resizeTerminal(
  id: string,
  cols: number,
  rows: number,
): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('resize_terminal', { id, cols, rows }).catch(() => {
      // Non-fatal — resize is best-effort
    });
  }
  // Mock: no-op
}

/**
 * Kill the shell and clean up listeners.
 */
export async function closeTerminal(id: string): Promise<void> {
  if (isTauri()) {
    // Clean up event listeners first
    const listeners = tauriListeners.get(id);
    if (listeners) {
      listeners.forEach((fn) => fn());
      tauriListeners.delete(id);
    }
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('close_terminal', { id }).catch(() => {
      // Non-fatal if already dead
    });
  } else {
    const mock = mockTerminals.get(id);
    if (mock) {
      mock.destroy();
      mockTerminals.delete(id);
    }
  }
}
