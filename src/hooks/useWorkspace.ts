/**
 * useWorkspace — manages open folders, the active workspace, and recent projects.
 *
 * State is kept in React state; recent projects are persisted to localStorage.
 */
import { useState, useEffect, useCallback } from 'react';
import type { FileEntry } from '../services/fileService';
import { readDirectory } from '../services/fileService';

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_WORKSPACES = 3;
const MAX_RECENTS = 5;
const RECENTS_KEY = 'agyStudio.recentProjects';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Workspace {
  /** Absolute path of the root folder */
  path: string;
  /** Display name (last path segment) */
  name: string;
  /** Top-level entries; null while loading */
  entries: FileEntry[] | null;
  /** Whether a load is in progress */
  loading: boolean;
  /** Error message if load failed */
  error: string | null;
}

export interface UseWorkspaceReturn {
  workspaces: Workspace[];
  activeIndex: number;
  activeWorkspace: Workspace | null;
  recentProjects: string[];
  openFolder: (path: string) => Promise<void>;
  closeWorkspace: (index: number) => void;
  setActiveIndex: (index: number) => void;
  reloadWorkspace: (index: number) => Promise<void>;
  expandDirectory: (workspaceIndex: number, dirPath: string) => Promise<FileEntry[]>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function lastName(path: string): string {
  // Works for both / and \ separators
  return path.replace(/[/\\]+$/, '').split(/[/\\]/).pop() ?? path;
}

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

function saveRecents(paths: string[]): void {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(paths.slice(0, MAX_RECENTS)));
  } catch {
    // Ignore localStorage errors (private browsing, quota exceeded, etc.)
  }
}

function addToRecents(path: string, current: string[]): string[] {
  const without = current.filter((p) => p !== path);
  return [path, ...without].slice(0, MAX_RECENTS);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWorkspace(): UseWorkspaceReturn {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentProjects, setRecentProjects] = useState<string[]>(loadRecents);

  // Clamp activeIndex when workspaces shrink
  useEffect(() => {
    if (workspaces.length === 0) return;
    if (activeIndex >= workspaces.length) {
      setActiveIndex(workspaces.length - 1);
    }
  }, [workspaces.length, activeIndex]);

  /** Load entries for a workspace slot by index. */
  const loadEntries = useCallback(async (index: number, path: string) => {
    setWorkspaces((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], loading: true, error: null };
      return next;
    });
    try {
      const entries = await readDirectory(path);
      setWorkspaces((prev) => {
        const next = [...prev];
        if (!next[index]) return prev;
        next[index] = { ...next[index], entries, loading: false };
        return next;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setWorkspaces((prev) => {
        const next = [...prev];
        if (!next[index]) return prev;
        next[index] = { ...next[index], loading: false, error: message };
        return next;
      });
    }
  }, []);

  /** Open a folder, adding a new workspace tab (or switching to existing). */
  const openFolder = useCallback(
    async (path: string) => {
      // Check if already open
      const existing = workspaces.findIndex((w) => w.path === path);
      if (existing !== -1) {
        setActiveIndex(existing);
        return;
      }

      const name = lastName(path);

      if (workspaces.length >= MAX_WORKSPACES) {
        // Replace the active workspace
        const idx = Math.min(activeIndex, workspaces.length - 1);
        setWorkspaces((prev) => {
          const next = [...prev];
          next[idx] = { path, name, entries: null, loading: true, error: null };
          return next;
        });
        setActiveIndex(idx);

        // Update recents
        setRecentProjects((prev) => {
          const updated = addToRecents(path, prev);
          saveRecents(updated);
          return updated;
        });

        await loadEntries(idx, path);
      } else {
        const newIdx = workspaces.length;
        setWorkspaces((prev) => [
          ...prev,
          { path, name, entries: null, loading: true, error: null },
        ]);
        setActiveIndex(newIdx);

        // Update recents
        setRecentProjects((prev) => {
          const updated = addToRecents(path, prev);
          saveRecents(updated);
          return updated;
        });

        await loadEntries(newIdx, path);
      }
    },
    [workspaces, activeIndex, loadEntries],
  );

  /** Close a workspace tab by index. */
  const closeWorkspace = useCallback((index: number) => {
    setWorkspaces((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next;
    });
    setActiveIndex((prev) => Math.max(0, prev > index ? prev - 1 : Math.min(prev, workspaces.length - 2)));
  }, [workspaces.length]);

  /** Reload the entries of a workspace. */
  const reloadWorkspace = useCallback(
    async (index: number) => {
      const ws = workspaces[index];
      if (!ws) return;
      await loadEntries(index, ws.path);
    },
    [workspaces, loadEntries],
  );

  /**
   * Load the children of a directory node (lazy expand).
   * Returns the loaded entries so FileTree can update its state.
   */
  const expandDirectory = useCallback(
    async (_workspaceIndex: number, dirPath: string): Promise<FileEntry[]> => {
      return readDirectory(dirPath);
    },
    [],
  );

  const activeWorkspace =
    workspaces.length > 0 ? (workspaces[activeIndex] ?? null) : null;

  return {
    workspaces,
    activeIndex,
    activeWorkspace,
    recentProjects,
    openFolder,
    closeWorkspace,
    setActiveIndex,
    reloadWorkspace,
    expandDirectory,
  };
}
