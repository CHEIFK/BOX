/**
 * XTerminal — wraps an xterm.js Terminal instance with FitAddon, WebLinksAddon.
 *
 * Connects to the backend via terminalService: shells output streams back as
 * Tauri events; keyboard input is forwarded via write_to_terminal.
 */
import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import {
  spawnShell,
  writeToTerminal,
  resizeTerminal,
} from '../../services/terminalService';
import '@xterm/xterm/css/xterm.css';
import './XTerminal.css';

// ── Theme ─────────────────────────────────────────────────────────────────────

const AGY_THEME = {
  background: '#08080f',
  foreground: '#e8e8f0',
  cursor: '#6c5ce7',
  cursorAccent: '#08080f',
  selectionBackground: '#6c5ce740',
  black: '#1a1a2e',
  red: '#ff6b6b',
  green: '#6bff8a',
  yellow: '#ffd166',
  blue: '#6c9ce7',
  magenta: '#c084fc',
  cyan: '#67e8f9',
  white: '#e8e8f0',
  brightBlack: '#3d3d5c',
  brightRed: '#ff8a8a',
  brightGreen: '#8affaa',
  brightYellow: '#ffe08a',
  brightBlue: '#8ab4f8',
  brightMagenta: '#d4a0fc',
  brightCyan: '#8af0ff',
  brightWhite: '#ffffff',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface XTerminalProps {
  id: string;
  cwd: string;
  isActive: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function XTerminal({ id, cwd, isActive }: XTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const initializedRef = useRef(false);

  // ── Resize observer ──────────────────────────────────────────────────────

  const fit = useCallback(() => {
    const fitAddon = fitAddonRef.current;
    const term = termRef.current;
    if (!fitAddon || !term) return;
    try {
      fitAddon.fit();
      resizeTerminal(id, term.cols, term.rows).catch(() => {});
    } catch {
      // fit() can throw if the container has zero size
    }
  }, [id]);

  // ── Mount: create xterm.js instance ─────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const term = new Terminal({
      theme: AGY_THEME,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      scrollback: 10000,
      cursorBlink: true,
      cursorStyle: 'bar',
      allowProposedApi: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Forward keyboard input to the shell
    term.onData((data) => {
      writeToTerminal(id, data).catch(console.error);
    });

    // Copy: Ctrl+Shift+C
    term.attachCustomKeyEventHandler((ev) => {
      if (ev.type === 'keydown') {
        if (ev.ctrlKey && ev.shiftKey && ev.key === 'C') {
          const sel = term.getSelection();
          if (sel) navigator.clipboard.writeText(sel).catch(() => {});
          return false; // prevent default
        }
        if (ev.ctrlKey && ev.shiftKey && ev.key === 'V') {
          navigator.clipboard
            .readText()
            .then((text) => writeToTerminal(id, text))
            .catch(() => {});
          return false;
        }
      }
      return true;
    });

    // Spawn the shell
    spawnShell(
      id,
      cwd,
      (data) => term.write(data),
      () => term.write('\r\n\x1b[31m[Process exited]\x1b[0m\r\n'),
    ).catch((err) => {
      term.write(`\r\n\x1b[31mFailed to start shell: ${err}\x1b[0m\r\n`);
    });

    // Cleanup on unmount
    return () => {
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
      initializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // ── Resize observer: refit when container size changes ───────────────────

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [fit]);

  // ── Focus when tab becomes active ────────────────────────────────────────

  useEffect(() => {
    if (isActive) {
      // Wait one frame so CSS display:none → block has taken effect
      requestAnimationFrame(() => {
        fit();
        termRef.current?.focus();
      });
    }
  }, [isActive, fit]);

  return (
    <div
      ref={containerRef}
      className="xterm-container"
      aria-label="Embedded terminal"
      data-terminal-id={id}
    />
  );
}
