/**
 * fileService — wraps Tauri `invoke` calls for filesystem operations.
 * Falls back to mock data when running outside Tauri (e.g. browser dev mode).
 */

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  extension: string | null;
  size: number;
  children: FileEntry[] | null;
}

// ── Tauri detection ───────────────────────────────────────────────────────────

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

function makeMockEntry(
  name: string,
  path: string,
  is_dir: boolean,
  extension: string | null = null,
  size = 0,
  children: FileEntry[] | null = null,
): FileEntry {
  return { name, path, is_dir, extension, size, children };
}

const MOCK_PATH = '/mock/my-project';

export const MOCK_TREE: FileEntry[] = [
  makeMockEntry('src', `${MOCK_PATH}/src`, true, null, 0, null),
  makeMockEntry('tests', `${MOCK_PATH}/tests`, true, null, 0, null),
  makeMockEntry('package.json', `${MOCK_PATH}/package.json`, false, 'json', 1024),
  makeMockEntry('README.md', `${MOCK_PATH}/README.md`, false, 'md', 2048),
  makeMockEntry('tsconfig.json', `${MOCK_PATH}/tsconfig.json`, false, 'json', 512),
  makeMockEntry('.gitignore', `${MOCK_PATH}/.gitignore`, false, null, 128),
];

const MOCK_SRC_CHILDREN: FileEntry[] = [
  makeMockEntry('App.tsx', `${MOCK_PATH}/src/App.tsx`, false, 'tsx', 3200),
  makeMockEntry('main.tsx', `${MOCK_PATH}/src/main.tsx`, false, 'tsx', 400),
  makeMockEntry('index.css', `${MOCK_PATH}/src/index.css`, false, 'css', 800),
  makeMockEntry('utils.ts', `${MOCK_PATH}/src/utils.ts`, false, 'ts', 1500),
  makeMockEntry('components', `${MOCK_PATH}/src/components`, true, null, 0, null),
];

const MOCK_TESTS_CHILDREN: FileEntry[] = [
  makeMockEntry('App.test.tsx', `${MOCK_PATH}/tests/App.test.tsx`, false, 'tsx', 1800),
  makeMockEntry('utils.test.ts', `${MOCK_PATH}/tests/utils.test.ts`, false, 'ts', 900),
];

const MOCK_COMPONENTS_CHILDREN: FileEntry[] = [
  makeMockEntry('Button.tsx', `${MOCK_PATH}/src/components/Button.tsx`, false, 'tsx', 600),
  makeMockEntry('Button.css', `${MOCK_PATH}/src/components/Button.css`, false, 'css', 300),
  makeMockEntry('Header.tsx', `${MOCK_PATH}/src/components/Header.tsx`, false, 'tsx', 900),
];

function getMockChildren(path: string): FileEntry[] {
  if (path === `${MOCK_PATH}/src`) return MOCK_SRC_CHILDREN;
  if (path === `${MOCK_PATH}/tests`) return MOCK_TESTS_CHILDREN;
  if (path === `${MOCK_PATH}/src/components`) return MOCK_COMPONENTS_CHILDREN;
  return [];
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Read one level of a directory. Returns FileEntry[] with children: null
 * for subdirs (they are loaded lazily on expand).
 */
export async function readDirectory(path: string): Promise<FileEntry[]> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<FileEntry[]>('read_directory', { path });
  }
  // Mock fallback
  if (path === MOCK_PATH) return MOCK_TREE;
  return getMockChildren(path);
}

/**
 * Open a native folder picker dialog.
 * Returns the chosen path, or null if cancelled.
 */
export async function pickFolder(): Promise<string | null> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({ directory: true, multiple: false, recursive: false });
    if (typeof selected === 'string') return selected;
    return null;
  }
  // Mock: return a fake path
  return MOCK_PATH;
}

/**
 * Open the system file manager at the given path.
 */
export async function revealInFileManager(path: string): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    // Use opener plugin to show file in folder
    await invoke('plugin:opener|open_path', { path }).catch(() => {
      // Fallback: try shell open
    });
  } else {
    console.log('[mock] Reveal in file manager:', path);
  }
}

/**
 * Copy a string to the clipboard.
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for older environments
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
}
