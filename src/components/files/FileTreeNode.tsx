/** FileTreeNode — a single file or directory entry in the tree */
import { useState, useEffect, useRef, useCallback } from 'react';
import type { FileEntry } from '../../services/fileService';
import { copyToClipboard, revealInFileManager } from '../../services/fileService';
import { useContext } from 'react';
import { EditorContext } from '../../contexts/EditorContext';
import { readFile } from '../../services/editorService';
import './FileTreeNode.css';

// ── File icon map ─────────────────────────────────────────────────────────────

function getFileIcon(entry: FileEntry): string {
  if (entry.is_dir) return '📁'; // closed; caller swaps to 📂 when expanded
  const ext = entry.extension?.toLowerCase() ?? '';
  switch (ext) {
    case 'ts':
    case 'tsx':
      return '📘';
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return '📙';
    case 'rs':
      return '⚙️';
    case 'py':
      return '🐍';
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return '🎨';
    case 'html':
    case 'htm':
      return '🏠';
    case 'md':
    case 'mdx':
      return '📝';
    case 'json':
    case 'jsonc':
      return '{}';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
    case 'ico':
      return '🖼️';
    default:
      return '📄';
  }
}

// ── Context menu ──────────────────────────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
}

interface ContextMenuProps {
  entry: FileEntry;
  pos: ContextMenuState;
  onClose: () => void;
}

function ContextMenu({ entry, pos, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleCopyPath = async () => {
    await copyToClipboard(entry.path);
    onClose();
  };

  const handleReveal = async () => {
    await revealInFileManager(entry.path);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="ctx-menu"
      style={{ top: pos.y, left: pos.x }}
      role="menu"
      aria-label="File actions"
    >
      <button className="ctx-menu__item" onClick={handleCopyPath} role="menuitem">
        <span aria-hidden="true">📋</span> Copy path
      </button>
      <button className="ctx-menu__item" onClick={handleReveal} role="menuitem">
        <span aria-hidden="true">📂</span> Reveal in file manager
      </button>
    </div>
  );
}

// ── FileTreeNode ──────────────────────────────────────────────────────────────

interface FileTreeNodeProps {
  entry: FileEntry;
  depth: number;
  searchQuery: string;
  /** Called when a directory needs its children loaded */
  onExpand: (path: string) => Promise<FileEntry[]>;
  /** Whether this node matches the search (only meaningful when searching) */
  isSearchMatch?: boolean;
}

export default function FileTreeNode({
  entry,
  depth,
  searchQuery,
  onExpand,
  isSearchMatch,
}: FileTreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[] | null>(entry.children);
  const [loading, setLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const editorCtx = useContext(EditorContext);

  // Collapse when a new search query arrives
  useEffect(() => {
    if (searchQuery) {
      setExpanded(true); // expand all when searching so matches are visible
    }
  }, [searchQuery]);

  const handleToggle = useCallback(async () => {
    if (!entry.is_dir) {
      // Open file in editor
      if (editorCtx) {
        try {
          const content = await readFile(entry.path);
          editorCtx.openFile(entry.path, content);
        } catch (e) {
          console.error('Failed to open file:', e);
        }
      }
      return;
    }
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);

    if (nextExpanded && children === null && !loading) {
      setLoading(true);
      try {
        const loaded = await onExpand(entry.path);
        setChildren(loaded);
      } finally {
        setLoading(false);
      }
    }
  }, [entry.is_dir, entry.path, expanded, children, loading, onExpand, editorCtx]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const icon = entry.is_dir ? (expanded ? '📂' : '📁') : getFileIcon(entry);
  const indent = depth * 12;

  // Highlight matching text in search mode
  const renderName = () => {
    if (!searchQuery || !isSearchMatch) return entry.name;
    const lower = entry.name.toLowerCase();
    const queryLower = searchQuery.toLowerCase();
    const idx = lower.indexOf(queryLower);
    if (idx === -1) return entry.name;
    return (
      <>
        {entry.name.slice(0, idx)}
        <mark className="file-tree-node__mark">{entry.name.slice(idx, idx + searchQuery.length)}</mark>
        {entry.name.slice(idx + searchQuery.length)}
      </>
    );
  };

  return (
    <li className="file-tree-node" role="treeitem" aria-expanded={entry.is_dir ? expanded : undefined}>
      <div
        className={`file-tree-node__row${isSearchMatch ? ' file-tree-node__row--match' : ''}`}
        style={{ paddingLeft: `${8 + indent}px` }}
        onClick={handleToggle}
        onContextMenu={handleContextMenu}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            void handleToggle();
          }
        }}
        role={entry.is_dir ? 'button' : 'button'}
        aria-label={`${entry.is_dir ? 'Folder' : 'File'}: ${entry.name}`}
      >
        {entry.is_dir && (
          <span className="file-tree-node__chevron" aria-hidden="true">
            {expanded ? '▾' : '▸'}
          </span>
        )}
        {!entry.is_dir && <span className="file-tree-node__chevron-spacer" aria-hidden="true" />}
        <span className="file-tree-node__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="file-tree-node__name">{renderName()}</span>
        {loading && (
          <span className="file-tree-node__loading" aria-label="Loading">…</span>
        )}
      </div>

      {entry.is_dir && expanded && children !== null && (
        <ul className="file-tree-node__children" role="group">
          {children.length === 0 ? (
            <li className="file-tree-node__empty" style={{ paddingLeft: `${8 + indent + 20}px` }}>
              (empty)
            </li>
          ) : (
            children.map((child) => (
              <FileTreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                searchQuery={searchQuery}
                onExpand={onExpand}
                isSearchMatch={
                  searchQuery
                    ? child.name.toLowerCase().includes(searchQuery.toLowerCase())
                    : undefined
                }
              />
            ))
          )}
        </ul>
      )}

      {contextMenu && (
        <ContextMenu
          entry={entry}
          pos={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
    </li>
  );
}
