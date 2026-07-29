/** useEditor — manages open tabs, active tab, dirty state, auto-save */
import { useCallback, useEffect, useRef, useState } from 'react';
import { writeFile } from '../services/editorService';

// ── Language detection ────────────────────────────────────────────────────────

export function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'rs':
      return 'rust';
    case 'py':
      return 'python';
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return 'css';
    case 'html':
    case 'htm':
      return 'html';
    case 'json':
    case 'jsonc':
      return 'json';
    case 'md':
    case 'mdx':
      return 'markdown';
    case 'sh':
    case 'bash':
    case 'zsh':
      return 'shell';
    case 'toml':
    case 'ini':
    case 'cfg':
      return 'ini';
    default:
      return 'plaintext';
  }
}

// ── Tab types ─────────────────────────────────────────────────────────────────

export interface EditorTab {
  /** Absolute file path — acts as unique ID */
  path: string;
  /** File name displayed on the tab */
  name: string;
  /** Current content (may differ from disk if dirty) */
  content: string;
  /** Language for Monaco syntax highlighting */
  language: string;
  /** True if content differs from saved version */
  isDirty: boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseEditorReturn {
  tabs: EditorTab[];
  activeTabPath: string | null;
  activeTab: EditorTab | null;
  openFile: (path: string, content: string) => void;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  updateContent: (path: string, newContent: string) => void;
  saveTab: (path: string) => Promise<void>;
  isSaving: boolean;
}

const AUTO_SAVE_DELAY = 1000; // ms

export function useEditor(): UseEditorReturn {
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /** Auto-save timers keyed by path */
  const autoSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  /** Saved content keyed by path — used to detect dirty state */
  const savedContent = useRef<Record<string, string>>({});

  const activeTab = tabs.find((t) => t.path === activeTabPath) ?? null;

  // ── Open a file (idempotent) ────────────────────────────────────────────────
  const openFile = useCallback((path: string, content: string) => {
    setTabs((prev) => {
      const exists = prev.find((t) => t.path === path);
      if (exists) return prev; // already open
      const name = path.split('/').pop() ?? path;
      const newTab: EditorTab = {
        path,
        name,
        content,
        language: detectLanguage(path),
        isDirty: false,
      };
      savedContent.current[path] = content;
      return [...prev, newTab];
    });
    setActiveTabPath(path);
  }, []);

  // ── Close a tab ────────────────────────────────────────────────────────────
  const closeTab = useCallback(
    (path: string) => {
      // Cancel pending auto-save
      if (autoSaveTimers.current[path]) {
        clearTimeout(autoSaveTimers.current[path]);
        delete autoSaveTimers.current[path];
      }
      delete savedContent.current[path];

      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.path === path);
        if (idx === -1) return prev;
        const next = prev.filter((t) => t.path !== path);
        // Update active tab when the closed tab was active
        setActiveTabPath((current) => {
          if (current !== path) return current;
          if (next.length === 0) return null;
          // Prefer the tab to the left; fall back to the tab to the right
          const newIdx = Math.max(0, idx - 1);
          return next[newIdx]?.path ?? null;
        });
        return next;
      });
    },
    [],
  );

  // ── Update content (called on every editor change) ────────────────────────
  const updateContent = useCallback((path: string, newContent: string) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.path !== path) return t;
        const isDirty = newContent !== (savedContent.current[path] ?? '');
        return { ...t, content: newContent, isDirty };
      }),
    );

    // Schedule auto-save
    if (autoSaveTimers.current[path]) {
      clearTimeout(autoSaveTimers.current[path]);
    }
    autoSaveTimers.current[path] = setTimeout(async () => {
      try {
        await writeFile(path, newContent);
        savedContent.current[path] = newContent;
        setTabs((prev) =>
          prev.map((t) => (t.path === path ? { ...t, isDirty: false } : t)),
        );
      } catch (e) {
        console.error('Auto-save failed:', e);
      }
      delete autoSaveTimers.current[path];
    }, AUTO_SAVE_DELAY);
  }, []);

  // ── Manual save (Ctrl+S) ──────────────────────────────────────────────────
  const saveTab = useCallback(async (path: string) => {
    const tab = tabs.find((t) => t.path === path);
    if (!tab) return;

    // Cancel pending auto-save
    if (autoSaveTimers.current[path]) {
      clearTimeout(autoSaveTimers.current[path]);
      delete autoSaveTimers.current[path];
    }

    setIsSaving(true);
    try {
      await writeFile(path, tab.content);
      savedContent.current[path] = tab.content;
      setTabs((prev) =>
        prev.map((t) => (t.path === path ? { ...t, isDirty: false } : t)),
      );
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setIsSaving(false);
    }
  }, [tabs]);

  // ── Ctrl+S keyboard handler ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeTabPath) {
          void saveTab(activeTabPath);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTabPath, saveTab]);

  // ── Cleanup timers on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      Object.values(autoSaveTimers.current).forEach(clearTimeout);
    };
  }, []);

  return {
    tabs,
    activeTabPath,
    activeTab,
    openFile,
    closeTab,
    setActiveTab: setActiveTabPath,
    updateContent,
    saveTab,
    isSaving,
  };
}
