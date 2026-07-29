/**
 * FilesPage — Phase 5: Workspace & Files
 *
 * Features:
 *  - Open folder via native Tauri dialog
 *  - Multiple workspace tabs (up to 3)
 *  - Recursive file tree with lazy expand
 *  - File search (fuzzy filename filter)
 *  - Recent projects (up to 5, stored in localStorage)
 *  - Context menu: Copy path, Reveal in file manager
 *  - Empty state with CTA button
 */
import { useState, useCallback } from 'react';
import { useWorkspace } from '../hooks/useWorkspace';
import { pickFolder } from '../services/fileService';
import WorkspaceTab from '../components/files/WorkspaceTab';
import FileSearch from '../components/files/FileSearch';
import FileTree from '../components/files/FileTree';
import './FilesPage.css';

export default function FilesPage() {
  const {
    workspaces,
    activeIndex,
    activeWorkspace,
    recentProjects,
    openFolder,
    closeWorkspace,
    setActiveIndex,
    reloadWorkspace,
    expandDirectory,
  } = useWorkspace();

  const [searchQuery, setSearchQuery] = useState('');

  // Open folder via Tauri (or mock) dialog
  const handleOpenFolder = useCallback(async () => {
    const path = await pickFolder();
    if (path) {
      setSearchQuery('');
      await openFolder(path);
    }
  }, [openFolder]);

  // Open a recent project directly
  const handleOpenRecent = useCallback(
    async (path: string) => {
      setSearchQuery('');
      await openFolder(path);
    },
    [openFolder],
  );

  const handleExpand = useCallback(
    (dirPath: string) => expandDirectory(activeIndex, dirPath),
    [activeIndex, expandDirectory],
  );

  // ── Empty state ───────────────────────────────────────────────────────────

  if (workspaces.length === 0) {
    return (
      <div className="files-page files-page--empty" aria-label="Files page">
        <div className="files-empty">
          <span className="files-empty__icon" aria-hidden="true">📁</span>
          <h2 className="files-empty__title">Open a folder to start</h2>
          <p className="files-empty__sub">
            Browse and manage your project files right here.
          </p>
          <button
            className="files-empty__btn"
            onClick={handleOpenFolder}
            aria-label="Open a folder"
          >
            Open Folder…
          </button>

          {recentProjects.length > 0 && (
            <div className="files-empty__recents">
              <p className="files-empty__recents-label">Recent projects</p>
              <ul className="files-empty__recents-list" role="list">
                {recentProjects.map((p) => (
                  <li key={p}>
                    <button
                      className="files-empty__recent-item"
                      onClick={() => void handleOpenRecent(p)}
                      title={p}
                    >
                      <span aria-hidden="true">📂</span>
                      <span className="files-empty__recent-name">{p.replace(/.*[/\\]/, '')}</span>
                      <span className="files-empty__recent-path">{p}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────

  return (
    <div className="files-page" aria-label="Files page">
      {/* Workspace tab bar */}
      <div className="files-tabbar" role="tablist" aria-label="Open workspaces">
        {workspaces.map((ws, i) => (
          <WorkspaceTab
            key={ws.path}
            workspace={ws}
            isActive={i === activeIndex}
            onClick={() => setActiveIndex(i)}
            onClose={() => closeWorkspace(i)}
          />
        ))}
        <button
          className="files-tabbar__add"
          onClick={handleOpenFolder}
          title="Open folder"
          aria-label="Open a new folder"
          disabled={workspaces.length >= 3}
        >
          +
        </button>
      </div>

      {/* Toolbar: reload + open new */}
      <div className="files-toolbar">
        <span className="files-toolbar__path" title={activeWorkspace?.path}>
          {activeWorkspace?.path ?? ''}
        </span>
        <button
          className="files-toolbar__btn"
          onClick={() => void reloadWorkspace(activeIndex)}
          title="Reload workspace"
          aria-label="Reload workspace"
        >
          ↺
        </button>
        <button
          className="files-toolbar__btn"
          onClick={handleOpenFolder}
          title="Open folder"
          aria-label="Open folder"
        >
          📁
        </button>
      </div>

      {/* Search bar */}
      <FileSearch
        value={searchQuery}
        onChange={setSearchQuery}
      />

      {/* File tree */}
      <div className="files-tree-wrap">
        {activeWorkspace?.loading && (
          <div className="files-loading" role="status" aria-label="Loading files">
            <span className="files-loading__spinner" aria-hidden="true">⏳</span>
            Loading…
          </div>
        )}
        {activeWorkspace?.error && (
          <div className="files-error" role="alert">
            <span aria-hidden="true">⚠️</span> {activeWorkspace.error}
          </div>
        )}
        {activeWorkspace?.entries && !activeWorkspace.loading && (
          <FileTree
            entries={activeWorkspace.entries}
            searchQuery={searchQuery}
            onExpand={handleExpand}
          />
        )}
      </div>

      {/* Recent projects panel (shown when there is room) */}
      {recentProjects.length > 0 && (
        <div className="files-recents">
          <p className="files-recents__label">Recent</p>
          <ul className="files-recents__list" role="list">
            {recentProjects.map((p) => {
              const isOpen = workspaces.some((w) => w.path === p);
              return (
                <li key={p}>
                  <button
                    className={`files-recents__item${isOpen ? ' files-recents__item--open' : ''}`}
                    onClick={() => !isOpen && void handleOpenRecent(p)}
                    disabled={isOpen}
                    title={p}
                    aria-label={`Open recent: ${p}`}
                  >
                    <span aria-hidden="true">📂</span>
                    <span className="files-recents__name">{p.replace(/.*[/\\]/, '')}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
