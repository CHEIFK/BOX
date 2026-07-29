/**
 * useTerminals — manages the array of open terminal instances.
 *
 * Each terminal has a unique ID, a title, and an optional cwd.
 * Up to MAX_TERMINALS can be open simultaneously.
 */
import { useState, useCallback } from 'react';
import { closeTerminal } from '../services/terminalService';

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_TERMINALS = 5;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TerminalInstance {
  id: string;
  title: string;
  cwd: string;
}

export interface UseTerminalsReturn {
  terminals: TerminalInstance[];
  activeId: string | null;
  addTerminal: (cwd?: string) => void;
  removeTerminal: (id: string) => void;
  setActiveId: (id: string) => void;
  renameTerminal: (id: string, title: string) => void;
}

// ── ID generator ──────────────────────────────────────────────────────────────

let _counter = 0;
function nextId(): string {
  _counter += 1;
  return `term-${Date.now()}-${_counter}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTerminals(defaultCwd = ''): UseTerminalsReturn {
  const [terminals, setTerminals] = useState<TerminalInstance[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  /** Add a new terminal tab (capped at MAX_TERMINALS). */
  const addTerminal = useCallback(
    (cwd?: string) => {
      if (terminals.length >= MAX_TERMINALS) return;

      const id = nextId();
      const resolvedCwd = cwd ?? defaultCwd;
      const number = terminals.length + 1;
      const newTerminal: TerminalInstance = {
        id,
        title: `Terminal ${number}`,
        cwd: resolvedCwd,
      };

      setTerminals((prev) => [...prev, newTerminal]);
      setActiveId(id);
    },
    [terminals.length, defaultCwd],
  );

  /** Close a terminal tab and kill its shell process. */
  const removeTerminal = useCallback(
    (id: string) => {
      // Kill the shell in the background
      closeTerminal(id).catch(console.error);

      setTerminals((prev) => {
        const next = prev.filter((t) => t.id !== id);
        return next;
      });

      setActiveId((prev) => {
        if (prev !== id) return prev;
        // Activate the neighbouring tab
        const idx = terminals.findIndex((t) => t.id === id);
        const remaining = terminals.filter((t) => t.id !== id);
        if (remaining.length === 0) return null;
        const newIdx = Math.min(idx, remaining.length - 1);
        return remaining[newIdx]?.id ?? null;
      });
    },
    [terminals],
  );

  /** Rename a terminal tab (e.g. when the shell reports its cwd). */
  const renameTerminal = useCallback((id: string, title: string) => {
    setTerminals((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title } : t)),
    );
  }, []);

  return {
    terminals,
    activeId,
    addTerminal,
    removeTerminal,
    setActiveId,
    renameTerminal,
  };
}
