/**
 * FileTree — renders the full recursive tree for a workspace.
 * Handles search filtering and lazy expand via onExpand callback.
 */
import type { FileEntry } from '../../services/fileService';
import FileTreeNode from './FileTreeNode';
import './FileTree.css';

interface FileTreeProps {
  entries: FileEntry[];
  searchQuery: string;
  onExpand: (path: string) => Promise<FileEntry[]>;
}

/**
 * Fuzzy match: every character of `query` appears in `str` in order
 * (case-insensitive). Falls back to simple `includes` for performance
 * since most queries are short substrings anyway.
 */
function fuzzyMatch(str: string, query: string): boolean {
  if (!query) return true;
  const s = str.toLowerCase();
  const q = query.toLowerCase();
  // Simple substring match is fast and intuitive for short queries
  return s.includes(q);
}

/**
 * Recursively collect all file entries (not dirs) that match the query.
 * Returns a flat list used to count results.
 */
function collectMatches(entries: FileEntry[], query: string): FileEntry[] {
  const matches: FileEntry[] = [];
  for (const entry of entries) {
    if (!entry.is_dir && fuzzyMatch(entry.name, query)) {
      matches.push(entry);
    }
    if (entry.children) {
      matches.push(...collectMatches(entry.children, query));
    }
  }
  return matches;
}

export default function FileTree({ entries, searchQuery, onExpand }: FileTreeProps) {
  // In search mode show only entries whose name matches (or dirs that contain
  // matching descendants). For simplicity we show all top-level entries and
  // let each node handle its own filtering/highlighting.
  const filteredEntries = searchQuery
    ? entries.filter((e) => {
        if (e.is_dir) return true; // always show dirs; node will auto-expand
        return fuzzyMatch(e.name, searchQuery);
      })
    : entries;

  if (filteredEntries.length === 0 && searchQuery) {
    return (
      <div className="file-tree__no-results" role="status">
        No files matching "{searchQuery}"
      </div>
    );
  }

  return (
    <ul className="file-tree" role="tree" aria-label="File tree">
      {filteredEntries.map((entry) => (
        <FileTreeNode
          key={entry.path}
          entry={entry}
          depth={0}
          searchQuery={searchQuery}
          onExpand={onExpand}
          isSearchMatch={
            searchQuery ? fuzzyMatch(entry.name, searchQuery) : undefined
          }
        />
      ))}
    </ul>
  );
}

export { collectMatches };
